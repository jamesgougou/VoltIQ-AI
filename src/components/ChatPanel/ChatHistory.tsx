"use client";

import type { ChatMessage } from "@/types/chat";
import { ChatEmptyState } from "./ChatEmptyState";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { TypingIndicator } from "./TypingIndicator";

type ChatHistoryProps = {
  messages: ChatMessage[];
  isLoading: boolean;
  bottomRef: React.RefObject<HTMLDivElement | null>;
};

export function ChatHistory({
  messages,
  isLoading,
  bottomRef,
}: ChatHistoryProps) {
  const isEmpty = messages.length === 0 && !isLoading;

  return (
    <div
      className={`overflow-y-auto overscroll-contain ${
        isEmpty ? "" : "min-h-0 flex-1"
      }`}
    >
      {isEmpty ? (
        <ChatEmptyState />
      ) : (
        <div className="space-y-5 px-4 py-6 sm:px-6">
          {messages.map((message) => (
            <ChatMessageBubble
              key={message.id}
              id={message.id}
              role={message.role}
              content={message.content}
              createdAt={message.createdAt}
              sources={message.sources}
              calculation={message.calculation}
            />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} className="h-px shrink-0" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
