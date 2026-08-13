"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { QuickPrompts } from "./QuickPrompts";

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  isStreaming?: boolean;
  onPromptSelect: (prompt: string) => void;
  disabled?: boolean;
  inputDisabled?: boolean;
  placeholder?: string;
  helperText?: string;
  focusTrigger?: number;
  /** Retrieval scope controls rendered above the message field. */
  scopeBar?: ReactNode;
};

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming = false,
  onPromptSelect,
  disabled = false,
  inputDisabled = false,
  placeholder = "Ask anything...",
  helperText = "Enter to send · Shift+Enter for new line",
  focusTrigger = 0,
  scopeBar,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isLocked = disabled || inputDisabled;

  useEffect(() => {
    if (!inputDisabled) {
      textareaRef.current?.focus();
    }
  }, [focusTrigger, inputDisabled]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isLocked && !isStreaming) {
        onSend();
      }
    }
  }

  function handlePromptSelect(prompt: string) {
    onPromptSelect(prompt);
    textareaRef.current?.focus();
  }

  const canSend = value.trim().length > 0 && !disabled && !inputDisabled && !isStreaming;

  return (
    <div className="sticky bottom-0 z-10 shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="border-b border-slate-100 px-4 py-2 sm:px-6">
        <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Message input
          {isStreaming ? " · Generating…" : ""}
        </h3>
      </div>
      <div className="px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-3">
          {scopeBar}

          {!inputDisabled && !isStreaming && (
            <QuickPrompts
              onSelect={handlePromptSelect}
              disabled={disabled}
            />
          )}

          <div className="flex items-end gap-3">
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isLocked}
                rows={1}
                className="max-h-32 min-h-[48px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                aria-label="Chat message input"
              />
            </div>
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="flex h-12 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 shadow-sm transition-all hover:bg-red-100"
                aria-label="Stop generating"
              >
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={onSend}
                disabled={!canSend}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm transition-all hover:bg-violet-700 hover:shadow disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                aria-label="Send message"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-slate-400">
          {helperText}
        </p>
      </div>
    </div>
  );
}
