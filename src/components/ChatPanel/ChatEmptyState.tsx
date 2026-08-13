type ChatEmptyStateProps = {
  message: string;
  onOpenLibrary?: () => void;
  showLibraryCta?: boolean;
};

export function ChatEmptyState({
  message,
  onOpenLibrary,
  showLibraryCta = true,
}: ChatEmptyStateProps) {
  return (
    <div className="flex min-h-[200px] items-center justify-center px-4 py-6 text-center sm:min-h-[280px]">
      <div className="max-w-sm space-y-3">
        <p className="text-sm text-slate-500">{message}</p>
        {showLibraryCta && onOpenLibrary ? (
          <button
            type="button"
            onClick={onOpenLibrary}
            className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 transition-colors hover:bg-violet-100"
          >
            Open Library
          </button>
        ) : null}
      </div>
    </div>
  );
}
