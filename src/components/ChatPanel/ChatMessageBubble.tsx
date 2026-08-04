"use client";

import { formatMessageTime } from "@/lib/format";
import { CopyButton } from "./CopyButton";
import { MarkdownContent } from "./MarkdownContent";

type ChatMessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

export function ChatMessageBubble({
  role,
  content,
  createdAt,
}: ChatMessageBubbleProps) {
  const isUser = role === "user";
  const timestamp = formatMessageTime(createdAt);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex max-w-[88%] gap-3 sm:max-w-[78%] ${
          isUser ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {!isUser && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 shadow-sm">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
              />
            </svg>
          </div>
        )}

        <div
          className={`min-w-0 ${isUser ? "items-end" : "items-start"} flex flex-col`}
        >
          {!isUser && (
            <div className="mb-1.5 flex w-full items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-500">
                VoltIQ AI
              </span>
              <CopyButton text={content} />
            </div>
          )}

          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
              isUser
                ? "rounded-tr-md bg-slate-800 text-white whitespace-pre-wrap"
                : "rounded-tl-md border border-slate-200/80 bg-slate-50 text-slate-800"
            }`}
          >
            {isUser ? content : <MarkdownContent content={content} />}
          </div>

          <span
            className={`mt-1.5 text-[11px] text-slate-400 ${
              isUser ? "text-right" : "text-left"
            }`}
          >
            {timestamp}
          </span>
        </div>
      </div>
    </div>
  );
}
