"use client";

type FollowUpActionsProps = {
  onPracticeAgain: () => void;
  onHarder: () => void;
  onEasier: () => void;
  onExplainSimply: () => void;
  onShowExample: () => void;
  disabled?: boolean;
};

export function FollowUpActions({
  onPracticeAgain,
  onHarder,
  onEasier,
  onExplainSimply,
  onShowExample,
  disabled = false,
}: FollowUpActionsProps) {
  const actions = [
    { label: "Practice Again", onClick: onPracticeAgain },
    { label: "Harder Question", onClick: onHarder },
    { label: "Easier Question", onClick: onEasier },
    { label: "Explain Simply", onClick: onExplainSimply },
    { label: "Show Real Example", onClick: onShowExample },
  ];

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          disabled={disabled}
          onClick={action.onClick}
          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
