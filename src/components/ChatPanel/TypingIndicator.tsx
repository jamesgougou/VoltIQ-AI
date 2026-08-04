export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[88%] gap-3 sm:max-w-[78%]">
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

        <div>
          <span className="mb-1.5 block text-xs font-medium text-slate-500">
            VoltIQ AI
          </span>
          <div
            className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-slate-200/80 bg-slate-50 px-4 py-3.5 shadow-sm"
            role="status"
            aria-live="polite"
            aria-label="AI is typing"
          >
            <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
            <span className="typing-dot typing-dot-delay-1 h-2 w-2 rounded-full bg-slate-400" />
            <span className="typing-dot typing-dot-delay-2 h-2 w-2 rounded-full bg-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
