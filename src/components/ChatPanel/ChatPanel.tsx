"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDocumentExtractionError, hasUsableDocumentContent } from "@/lib/chat/buildPrompt";
import { streamChatResponse } from "@/lib/chat/streamChat";
import { resolveClientIndexingGateMessage, fetchDocumentIndexStatuses, mergeIndexStates } from "@/lib/rag/client";
import {
  formatRetrievalScopeLabel,
  resolveRetrievalDocumentIds,
  type RetrievalScope,
} from "@/lib/rag/libraryMeta";
import {
  buildExplainPrompt,
  CALCULATOR_REDIRECT_MESSAGE,
  formatCalcResultMarkdown,
  isCalculatorExplainPrompt,
  isFreeFormCalculationRequest,
  suggestedCalculatorId,
  type CalcResult,
  type CalculatorId,
} from "@/lib/calculators";
import type { ChatMessage } from "@/types/chat";
import type { DocumentContextItem } from "@/types/documentContext";
import type { DocumentIndexState } from "@/types/rag";
import type { StudyModeId } from "@/types/study";
import { CalculatorsPanel } from "@/components/Calculators";
import { StudyPanel } from "@/components/Study";
import { AIToolsPanel } from "./AIToolsPanel";
import { ChatHistory } from "./ChatHistory";
import { ChatInput } from "./ChatInput";
import { RetrievalScopeBar } from "./RetrievalScopeBar";

type ChatPanelProps = {
  hasDocuments?: boolean;
  documents?: DocumentContextItem[];
  indexStates?: Record<string, DocumentIndexState>;
  indexingInProgress?: boolean;
  retrievalScope?: RetrievalScope;
  onRetrievalScopeChange?: (scope: RetrievalScope) => void;
};

function createMessage(
  role: ChatMessage["role"],
  content: string,
  id?: string,
  sources?: ChatMessage["sources"],
  calculation?: CalcResult,
): ChatMessage {
  return {
    id: id ?? crypto.randomUUID(),
    role,
    content,
    createdAt: new Date(),
    sources,
    calculation,
  };
}

export function ChatPanel({
  hasDocuments = false,
  documents = [],
  indexStates = {},
  indexingInProgress = false,
  retrievalScope = { mode: "all-enabled" },
  onRetrievalScopeChange,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [studyMode, setStudyMode] = useState<StudyModeId>("idle");
  const [calculatorFocusId, setCalculatorFocusId] =
    useState<CalculatorId | null>(null);
  const [calculatorFocusToken, setCalculatorFocusToken] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const previousHasDocuments = useRef(hasDocuments);
  const previousIsLoading = useRef(isLoading);

  const openCalculator = useCallback((id: CalculatorId) => {
    setCalculatorFocusId(id);
    setCalculatorFocusToken((current) => current + 1);
  }, []);

  const focusInput = useCallback(() => {
    setFocusTrigger((current) => current + 1);
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  const scopeDocuments = useMemo(
    () =>
      documents.map((document) => ({
        id: document.id,
        name: document.name,
        enabled: document.enabled !== false,
      })),
    [documents],
  );

  const retrievalDocumentIds = useMemo(
    () => resolveRetrievalDocumentIds(scopeDocuments, retrievalScope),
    [scopeDocuments, retrievalScope],
  );

  const searchingLabel = useMemo(
    () => formatRetrievalScopeLabel(scopeDocuments, retrievalScope),
    [scopeDocuments, retrievalScope],
  );

  const scopedDocuments = useMemo(
    () =>
      documents.filter((document) =>
        retrievalDocumentIds.includes(document.id),
      ),
    [documents, retrievalDocumentIds],
  );

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (hasDocuments && !previousHasDocuments.current) {
      focusInput();
    }
    previousHasDocuments.current = hasDocuments;
  }, [hasDocuments, focusInput]);

  useEffect(() => {
    if (previousIsLoading.current && !isLoading && hasDocuments) {
      focusInput();
    }
    previousIsLoading.current = isLoading;
  }, [isLoading, hasDocuments, focusInput]);

  const sendMessage = useCallback(
    async (messageOverride?: string) => {
      const trimmed = (messageOverride ?? input).trim();
      if (!trimmed || isLoading) return;

      // Free-form numerical calc requests never go to the LLM.
      // Route users to the Electrical Calculators panel instead.
      if (
        isFreeFormCalculationRequest(trimmed) &&
        !isCalculatorExplainPrompt(trimmed)
      ) {
        const calculatorId = suggestedCalculatorId(trimmed);
        openCalculator(calculatorId);
        setInput("");
        setMessages((current) => [
          ...current,
          createMessage("user", trimmed),
          createMessage("assistant", CALCULATOR_REDIRECT_MESSAGE),
        ]);
        return;
      }

      // Explain-with-AI and normal RAG chat still require documents.
      if (!hasDocuments || indexingInProgress) return;

      const userMessage = createMessage("user", trimmed);
      const nextMessages = [...messages, userMessage];
      const assistantMessageId = crypto.randomUUID();

      setMessages(nextMessages);
      setInput("");
      setIsLoading(true);

      const extractionError = getDocumentExtractionError(documents);
      if (extractionError) {
        setIsLoading(false);
        setMessages((prev) => [
          ...prev,
          createMessage("assistant", extractionError, assistantMessageId),
        ]);
        return;
      }

      const gateDocuments =
        scopedDocuments.length > 0 ? scopedDocuments : documents;

      const indexingGateMessage = resolveClientIndexingGateMessage(
        gateDocuments,
        hasUsableDocumentContent(gateDocuments)
          ? mergeIndexStates(
              indexStates,
              await fetchDocumentIndexStatuses(
                gateDocuments.map((document) => document.id),
              ),
            )
          : indexStates,
      );

      if (indexingGateMessage) {
        setIsLoading(false);
        setMessages((prev) => [
          ...prev,
          createMessage("assistant", indexingGateMessage, assistantMessageId),
        ]);
        return;
      }

      let streamedContent = "";
      let hasStreamStarted = false;
      const hasTextDocuments = hasUsableDocumentContent(documents);
      const documentIds = retrievalDocumentIds;

      try {
        await streamChatResponse(
          nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          {
            hasTextDocuments,
            documentIds,
            onChunk: (chunk) => {
              streamedContent += chunk;

              if (!hasStreamStarted) {
                hasStreamStarted = true;
                setIsLoading(false);
                setMessages((prev) => [
                  ...prev,
                  createMessage(
                    "assistant",
                    streamedContent,
                    assistantMessageId,
                  ),
                ]);
                return;
              }

              setMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantMessageId
                    ? { ...message, content: streamedContent }
                    : message,
                ),
              );
            },
            onSources: (sources) => {
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantMessageId
                    ? { ...message, sources }
                    : message,
                ),
              );
            },
          },
        );

        if (!hasStreamStarted) {
          setMessages((prev) => [
            ...prev,
            createMessage(
              "assistant",
              "I couldn't generate a response. Please try again.",
              assistantMessageId,
            ),
          ]);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.";

        if (hasStreamStarted) {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId
                ? {
                    ...message,
                    content: `${streamedContent}\n\n---\n\n**Error:** ${errorMessage}`,
                  }
                : message,
            ),
          );
        } else {
          setMessages((prev) => [
            ...prev,
            createMessage("assistant", errorMessage, assistantMessageId),
          ]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      input,
      isLoading,
      hasDocuments,
      messages,
      documents,
      scopedDocuments,
      retrievalDocumentIds,
      indexStates,
      indexingInProgress,
      openCalculator,
    ],
  );

  function handlePromptSelect(prompt: string) {
    setInput(prompt);
  }

  function handleTutorPrompt(prompt: string) {
    void sendMessage(prompt);
    focusInput();
  }

  function handleToolSelect(prompt: string) {
    void sendMessage(prompt);
  }

  function handleSendCalcResult(result: CalcResult) {
    setMessages((current) => [
      ...current,
      createMessage(
        "assistant",
        formatCalcResultMarkdown(result),
        undefined,
        undefined,
        result,
      ),
    ]);
    scrollToBottom();
  }

  function handleExplainCalcResult(result: CalcResult) {
    void sendMessage(buildExplainPrompt(result));
  }

  const hasConversation = messages.length > 0 || isLoading;

  return (
    <section
      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      aria-labelledby="chat-panel-heading"
    >
      <div className="border-b border-slate-200 px-4 py-3 sm:px-6">
        <h2
          id="chat-panel-heading"
          className="text-sm font-semibold text-slate-900"
        >
          AI Chat
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Ask document and standards questions here. Use Electrical Calculators
          above for numerical power, voltage drop, cable and demand calculations.
        </p>
      </div>

      <div className="border-b border-slate-100 px-4 py-3 sm:px-6">
        <CalculatorsPanel
          onSendResultToChat={handleSendCalcResult}
          onExplainResult={handleExplainCalcResult}
          explainDisabled={isLoading || !hasDocuments || indexingInProgress}
          focusCalculatorId={calculatorFocusId}
          focusToken={calculatorFocusToken}
        />
      </div>

      <div className="border-b border-slate-100 px-4 py-3 sm:px-6">
        <AIToolsPanel
          onToolSelect={handleToolSelect}
          disabled={isLoading || !hasDocuments}
        />
      </div>

      <div
        className={`flex flex-col ${
          hasConversation ? "min-h-[min(480px,calc(100vh-20rem))]" : ""
        }`}
      >
        <div className="border-b border-slate-100 px-4 py-3 sm:px-6">
          <StudyPanel
            activeMode={studyMode}
            onModeChange={setStudyMode}
            documentIds={retrievalDocumentIds}
            onSendTutorPrompt={handleTutorPrompt}
            hasDocuments={hasDocuments}
            disabled={isLoading || indexingInProgress}
          />
        </div>

        <ChatHistory
          messages={messages}
          isLoading={isLoading}
          bottomRef={bottomRef}
        />
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => void sendMessage()}
          onPromptSelect={handlePromptSelect}
          disabled={isLoading}
          inputDisabled={!hasDocuments || indexingInProgress}
          placeholder={
            indexingInProgress
              ? "Document indexing in progress..."
              : "Ask about your documents or standards…"
          }
          helperText={
            indexingInProgress
              ? "Document indexing in progress..."
              : "For numerical calculations use Electrical Calculators · Enter to send"
          }
          focusTrigger={focusTrigger}
          scopeBar={
            documents.length > 0 && onRetrievalScopeChange ? (
              <RetrievalScopeBar
                scope={retrievalScope}
                documents={scopeDocuments}
                searchingLabel={searchingLabel}
                onChange={onRetrievalScopeChange}
                disabled={isLoading}
              />
            ) : null
          }
        />
      </div>
    </section>
  );
}
