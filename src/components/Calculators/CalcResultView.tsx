"use client";

import type { CalcResult } from "@/lib/calculators";

type CalcResultViewProps = {
  result: CalcResult;
  onSendToChat?: () => void;
  onExplain?: () => void;
  explainDisabled?: boolean;
};

export function CalcResultView({
  result,
  onSendToChat,
  onExplain,
  explainDisabled = false,
}: CalcResultViewProps) {
  return (
    <div
      className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3"
      role="region"
      aria-label="Electrical calculator result"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
            Electrical Calculator
          </p>
          <h4 className="text-sm font-semibold text-slate-900">{result.title}</h4>
        </div>
        <span
          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
            result.ok
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-900"
          }`}
        >
          {result.ok ? "Complete" : "Incomplete"}
        </span>
      </div>

      <section className="mt-3 space-y-3 text-xs text-slate-700">
        <div>
          <p className="font-semibold text-slate-900">Formula</p>
          <p className="mt-0.5 font-mono text-[12px] text-slate-800">
            {result.formula}
          </p>
        </div>

        <div>
          <p className="font-semibold text-slate-900">Inputs used</p>
          <ValueList
            items={result.inputsUsed.map((item) => ({
              label: item.label,
              value: item.unit ? `${item.value} ${item.unit}` : String(item.value),
            }))}
            empty="None recorded"
          />
        </div>

        <div>
          <p className="font-semibold text-slate-900">Result</p>
          <ValueList
            items={result.results.map((item) => ({
              label: item.label,
              value: item.unit ? `${item.value} ${item.unit}` : String(item.value),
            }))}
            empty="No numerical result — required inputs are missing or checks failed."
          />
        </div>

        <div>
          <p className="font-semibold text-slate-900">Assumptions</p>
          <BulletList items={result.assumptions} empty="None" />
        </div>

        {result.missingInputs.length > 0 && (
          <div>
            <p className="font-semibold text-red-800">Missing inputs</p>
            <BulletList items={result.missingInputs} empty="None" />
          </div>
        )}

        {result.notes && result.notes.length > 0 && (
          <div>
            <p className="font-semibold text-slate-900">Notes</p>
            <BulletList items={result.notes} empty="None" />
          </div>
        )}
      </section>

      {(onSendToChat || onExplain) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {onSendToChat && (
            <button
              type="button"
              onClick={onSendToChat}
              className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-50"
            >
              Send result to chat
            </button>
          )}
          {onExplain && (
            <button
              type="button"
              onClick={onExplain}
              disabled={explainDisabled}
              className="rounded-md bg-amber-700 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-800 disabled:bg-slate-300"
            >
              Explain with AI
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ValueList({
  items,
  empty,
}: {
  items: { label: string; value: string }[];
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="mt-0.5 text-slate-500">{empty}</p>;
  }

  return (
    <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
      {items.map((item) => (
        <li key={`${item.label}-${item.value}`}>
          <span className="font-medium">{item.label}:</span> {item.value}
        </li>
      ))}
    </ul>
  );
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="mt-0.5 text-slate-500">{empty}</p>;
  }

  return (
    <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
