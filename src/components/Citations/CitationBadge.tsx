type CitationBadgeProps = {
  index: number;
  label?: string;
  onClick: () => void;
};

export function CitationBadge({ index, label, onClick }: CitationBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-baseline gap-1 rounded-md px-0.5 text-inherit transition-colors hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1"
      aria-label={
        label
          ? `Jump to source ${index} for ${label}`
          : `Jump to source ${index}`
      }
    >
      {label && (
        <span className="text-inherit underline decoration-slate-300 decoration-dotted underline-offset-2 group-hover:decoration-violet-400">
          {label}
        </span>
      )}
      <sup className="ml-0.5 inline-flex min-w-[1.1rem] items-center justify-center rounded bg-violet-100 px-1 py-px text-[10px] font-semibold leading-none text-violet-700 transition-colors group-hover:bg-violet-200">
        {index}
      </sup>
    </button>
  );
}
