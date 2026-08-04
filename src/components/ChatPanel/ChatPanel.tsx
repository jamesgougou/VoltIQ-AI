"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDocumentExtractionError } from "@/lib/chat/buildPrompt";
import { streamChatResponse } from "@/lib/chat/streamChat";
import type { ChatMessage } from "@/types/chat";
import { toUploadedDocuments } from "@/types/documentContext";
import type { DocumentContextItem } from "@/types/documentContext";
import { StudyPanel } from "@/components/Study";
import { AIToolsPanel } from "./AIToolsPanel";
import { ChatHistory } from "./ChatHistory";
import { ChatInput } from "./ChatInput";

type ChatPanelProps = {
  hasDocuments?: boolean;
  documents?: DocumentContextItem[];
};

function createMessage(
  role: ChatMessage["role"],
  content: string,
  id?: string,
): ChatMessage {
  return {
    id: id ?? crypto.randomUUID(),
    role,
    content,
    createdAt: new Date(),
  };
}

export function ChatPanel({
  hasDocuments = false,
  documents = [],
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const previousHasDocuments = useRef(hasDocuments);
  const previousIsLoading = useRef(isLoading);

  const focusInput = useCallback(() => {
    setFocusTrigger((current) => current + 1);
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

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
      if (!trimmed || isLoading || !hasDocuments) return;

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

      let streamedContent = "";
      let hasStreamStarted = false;
      const uploadedDocuments = toUploadedDocuments(documents);

      try {
        await streamChatResponse(
          nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          uploadedDocuments,
          (chunk) => {
            streamedContent += chunk;

            if (!hasStreamStarted) {
              hasStreamStarted = true;
              setIsLoading(false);
              setMessages((prev) => [
                ...prev,
                createMessage("assistant", streamedContent, assistantMessageId),
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
    [input, isLoading, hasDocuments, messages, documents],
  );

  function handlePromptSelect(prompt: string) {
    setInput(prompt);
  }

  function handleStudySelect(prompt: string) {
    setInput(prompt);
    focusInput();
  }

  function handleToolSelect(prompt: string) {
    void sendMessage(prompt);
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
          Ask questions about your documents, standards, switchboards and solar
          systems.
        </p>
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
            onStudySelect={handleStudySelect}
            hasDocuments={hasDocuments}
            disabled={isLoading}
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
          inputDisabled={!hasDocuments}
          focusTrigger={focusTrigger}
        />
      </div>
    </section>
  );
}
