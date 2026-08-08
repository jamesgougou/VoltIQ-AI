"use client";

import type { CalculatorId } from "@/lib/calculators";

type CalculatorCardProps = {
  id: CalculatorId;
  title: string;
  description: string;
  active: boolean;
  onSelect: (id: CalculatorId) => void;
};

export function CalculatorCard({
  id,
  title,
  description,
  active,
  onSelect,
}: CalculatorCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-pressed={active}
      className={`rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
        active
          ? "border-amber-400 bg-amber-50"
          : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/40"
      }`}
    >
      <p className="text-xs font-semibold text-slate-900">{title}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
        {description}
      </p>
    </button>
  );
}
