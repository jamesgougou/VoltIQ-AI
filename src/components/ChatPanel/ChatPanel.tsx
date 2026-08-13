"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { getDocumentExtractionError, hasUsableDocumentContent } from "@/lib/chat/buildPrompt";
import type { AITool } from "@/lib/chat/aiTools";
import { formatStreamFailure } from "@/lib/chat/streamingUi";
import {
  resolveStreamAriaStatus,
  shouldShowTypingIndicator,
  streamAriaStatusLabel,
  type StreamAriaStatus,
} from "@/lib/chat/streamStatus";
import { ChatStreamError, streamChatResponse } from "@/lib/chat/streamChat";
import { shouldAbortStreamOnChatUnmount } from "@/lib/workspace/panelVisibility";
import {
  chatEmptyStateMessage,
  indexingHelperText,
} from "@/lib/workspace/emptyStateCopy";
import { resolveClientIndexingGateMessage, fetchDocumentIndexStatuses, mergeIndexStates } from "@/lib/rag/client";
import {
  formatRetrievalScopeLabel,
  resolveRetrievalDocumentIds,
  type RetrievalScope,
} from "@/lib/rag/libraryMeta";
import {
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
import { AIToolsPanel } from "./AIToolsPanel";
import { ChatHistory } from "./ChatHistory";
import { ChatInput } from "./ChatInput";
import { RetrievalScopeBar } from "./RetrievalScopeBar";

export type ChatBridge = {
  sendMessage: (text: string) => void;
  appendCalcResult: (result: CalcResult) => void;
};

type ChatPanelProps = {
  hasDocuments?: boolean;
  documents?: DocumentContextItem[];
  indexStates?: Record<string, DocumentIndexState>;
  indexingInProgress?: boolean;
  retrievalScope?: RetrievalScope;
  onRetrievalScopeChange?: (scope: RetrievalScope) => void;
  onRequestCalculatorMode?: (calculatorId: CalculatorId) => void;
  onRequestStudyMode?: (mode: StudyModeId) => void;
  onRequestLibraryMode?: () => void;
  chatBridgeRef?: MutableRefObject<ChatBridge | null>;
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
  onRequestCalculatorMode,
  onRequestStudyMode,
  onRequestLibraryMode,
  chatBridgeRef,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasReceivedAssistantToken, setHasReceivedAssistantToken] =
    useState(false);
  const [streamStatus, setStreamStatus] = useState<StreamAriaStatus>("idle");
  const [aiToolsOpen, setAiToolsOpen] = useState(false);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previousHasDocuments = useRef(hasDocuments);
  const previousIsStreaming = useRef(isStreaming);

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
  }, [messages, isStreaming, scrollToBottom]);

  useEffect(() => {
    if (hasDocuments && !previousHasDocuments.current) {
      focusInput();
    }
    previousHasDocuments.current = hasDocuments;
  }, [hasDocuments, focusInput]);

  useEffect(() => {
    if (previousIsStreaming.current && !isStreaming && hasDocuments) {
      focusInput();
    }
    previousIsStreaming.current = isStreaming;
  }, [isStreaming, hasDocuments, focusInput]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    return () => {
      // Safety net if Chat truly unmounts while a request is in flight.
      if (shouldAbortStreamOnChatUnmount(true, Boolean(abortRef.current))) {
        abortRef.current?.abort();
      }
    };
  }, []);

  const sendMessage = useCallback(
    async (messageOverride?: string) => {
      const trimmed = (messageOverride ?? input).trim();
      if (!trimmed || isStreaming) return;

      // Free-form numerical calc requests never go to the LLM.
      if (
        isFreeFormCalculationRequest(trimmed) &&
        !isCalculatorExplainPrompt(trimmed)
      ) {
        const calculatorId = suggestedCalculatorId(trimmed);
        onRequestCalculatorMode?.(calculatorId);
        setInput("");
        setMessages((current) => [
          ...current,
          createMessage("user", trimmed),
          createMessage("assistant", CALCULATOR_REDIRECT_MESSAGE),
        ]);
        return;
      }

      if (!hasDocuments || indexingInProgress) return;

      const userMessage = createMessage("user", trimmed);
      const nextMessages = [...messages, userMessage];
      const assistantMessageId = crypto.randomUUID();

      setMessages(nextMessages);
      setInput("");
      setIsStreaming(true);
      setHasReceivedAssistantToken(false);
      setStreamStatus("generating");

      const extractionError = getDocumentExtractionError(documents);
      if (extractionError) {
        setIsStreaming(false);
        setStreamStatus("idle");
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
        setIsStreaming(false);
        setStreamStatus("idle");
        setMessages((prev) => [
          ...prev,
          createMessage("assistant", indexingGateMessage, assistantMessageId),
        ]);
        return;
      }

      let streamedContent = "";
      let hasStreamStarted = false;
      let failureReason: string | null = null;
      const hasTextDocuments = hasUsableDocumentContent(documents);
      const documentIds = retrievalDocumentIds;
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChatResponse(
          nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          {
            hasTextDocuments,
            documentIds,
            signal: controller.signal,
            onChunk: (chunk) => {
              streamedContent += chunk;

              // First chunk opens the assistant bubble — streaming continues.
              if (!hasStreamStarted) {
                hasStreamStarted = true;
                setHasReceivedAssistantToken(true);
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
        const formatted = formatStreamFailure(error, streamedContent);
        failureReason = formatted.reason;

        if (hasStreamStarted || formatted.preserveContent) {
          setMessages((prev) => {
            const exists = prev.some(
              (message) => message.id === assistantMessageId,
            );
            if (exists) {
              return prev.map((message) =>
                message.id === assistantMessageId
                  ? { ...message, content: formatted.message }
                  : message,
              );
            }
            return [
              ...prev,
              createMessage("assistant", formatted.message, assistantMessageId),
            ];
          });
        } else if (!(error instanceof ChatStreamError && error.reason === "cancelled")) {
          setMessages((prev) => [
            ...prev,
            createMessage("assistant", formatted.message, assistantMessageId),
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            createMessage("assistant", formatted.message, assistantMessageId),
          ]);
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setIsStreaming(false);
        setStreamStatus(
          resolveStreamAriaStatus({
            isStreaming: false,
            failureReason,
            justCompleted: !failureReason,
          }),
        );
      }
    },
    [
      input,
      isStreaming,
      hasDocuments,
      messages,
      documents,
      scopedDocuments,
      retrievalDocumentIds,
      indexStates,
      indexingInProgress,
      onRequestCalculatorMode,
    ],
  );

  function handlePromptSelect(prompt: string) {
    setInput(prompt);
  }

  function handleToolSelect(tool: AITool) {
    if (tool.id === "generate-questions") {
      onRequestStudyMode?.("quiz");
      return;
    }
    void sendMessage(tool.prompt);
  }

  const appendCalcResult = useCallback(
    (result: CalcResult) => {
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
    },
    [scrollToBottom],
  );

  useEffect(() => {
    if (!chatBridgeRef) {
      return;
    }

    chatBridgeRef.current = {
      sendMessage: (text: string) => {
        void sendMessage(text);
      },
      appendCalcResult,
    };

    return () => {
      chatBridgeRef.current = null;
    };
  }, [chatBridgeRef, sendMessage, appendCalcResult]);

  const hasConversation = messages.length > 0 || isStreaming;
  const showTyping = shouldShowTypingIndicator(
    isStreaming,
    hasReceivedAssistantToken,
  );
  const emptyMessage = chatEmptyStateMessage({
    hasDocuments,
    indexingInProgress,
  });
  const ariaStatusText = streamAriaStatusLabel(
    isStreaming ? "generating" : streamStatus,
  );

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
          Ask document and standards questions. Use Calculator and Study modes
          from the tabs above for numerical work and quizzes.
        </p>
        <p className="sr-only" role="status" aria-live="polite">
          {ariaStatusText}
        </p>
      </div>

      <div className="border-b border-slate-100 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => setAiToolsOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
          aria-expanded={aiToolsOpen}
          aria-controls="chat-ai-tools-panel"
        >
          <span>AI Tools</span>
          <span className="font-normal text-slate-500">
            {aiToolsOpen ? "Hide" : "Show"}
          </span>
        </button>
        {aiToolsOpen && (
          <div id="chat-ai-tools-panel" className="mt-3">
            <AIToolsPanel
              onToolSelect={handleToolSelect}
              disabled={isStreaming || !hasDocuments}
            />
          </div>
        )}
      </div>

      <div
        className={`flex flex-col ${
          hasConversation
            ? "min-h-0 sm:min-h-[min(480px,calc(100vh-20rem))]"
            : ""
        }`}
      >
        <ChatHistory
          messages={messages}
          showTypingIndicator={showTyping}
          emptyMessage={emptyMessage}
          onOpenLibrary={onRequestLibraryMode}
          showLibraryCta={!hasDocuments || indexingInProgress}
          bottomRef={bottomRef}
        />
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => void sendMessage()}
          onStop={stopStreaming}
          isStreaming={isStreaming}
          onPromptSelect={handlePromptSelect}
          disabled={isStreaming}
          inputDisabled={!hasDocuments || indexingInProgress}
          placeholder={
            indexingInProgress
              ? "Indexing in progress — open Library to watch progress…"
              : "Ask about your documents or standards…"
          }
          helperText={indexingHelperText(indexingInProgress)}
          focusTrigger={focusTrigger}
          scopeBar={
            documents.length > 0 && onRetrievalScopeChange ? (
              <RetrievalScopeBar
                scope={retrievalScope}
                documents={scopeDocuments}
                searchingLabel={searchingLabel}
                onChange={onRetrievalScopeChange}
                disabled={isStreaming}
              />
            ) : null
          }
        />
      </div>
    </section>
  );
}
