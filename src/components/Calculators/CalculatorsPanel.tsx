"use client";

import { useEffect, useRef, useState } from "react";
import {
  CALCULATOR_TOOLS,
  type CalcResult,
  type CalculatorId,
} from "@/lib/calculators";
import { CalculatorCard } from "./CalculatorCard";
import { CalcResultView } from "./CalcResultView";
import { CableSizingForm } from "./forms/CableSizingForm";
import { MaxDemandForm } from "./forms/MaxDemandForm";
import { PowerCurrentForm } from "./forms/PowerCurrentForm";
import { VoltageDropForm } from "./forms/VoltageDropForm";

type CalculatorsPanelProps = {
  onSendResultToChat: (result: CalcResult) => void;
  onExplainResult: (result: CalcResult) => void;
  explainDisabled?: boolean;
  /** Open a specific calculator when focusToken changes. */
  focusCalculatorId?: CalculatorId | null;
  focusToken?: number;
};

export function CalculatorsPanel({
  onSendResultToChat,
  onExplainResult,
  explainDisabled = false,
  focusCalculatorId = null,
  focusToken = 0,
}: CalculatorsPanelProps) {
  const [activeId, setActiveId] = useState<CalculatorId | null>(null);
  const [result, setResult] = useState<CalcResult | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocusTokenRef = useRef(0);

  useEffect(() => {
    if (!focusCalculatorId || focusToken === lastFocusTokenRef.current) {
      return;
    }

    lastFocusTokenRef.current = focusToken;
    setActiveId(focusCalculatorId);
    setResult(null);
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [focusCalculatorId, focusToken]);

  function handleSelect(id: CalculatorId) {
    setActiveId((current) => (current === id ? null : id));
    setResult(null);
  }

  return (
    <div
      ref={panelRef}
      aria-labelledby="calculators-heading"
      className="space-y-3"
    >
      <div>
        <h3
          id="calculators-heading"
          className="text-sm font-semibold text-slate-900"
        >
          Electrical Calculators
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Use this panel for numerical work. Select a calculator, enter inputs,
          then Calculate — AI chat will not do the arithmetic.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {CALCULATOR_TOOLS.map((tool) => (
          <CalculatorCard
            key={tool.id}
            id={tool.id}
            title={tool.title}
            description={tool.description}
            active={activeId === tool.id}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {activeId && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/20 p-3 sm:p-4">
          <p className="mb-3 text-[11px] font-medium text-amber-900">
            Step: enter structured inputs → Calculate → review the Electrical
            Calculator result → optional Explain with AI
          </p>

          {activeId === "power-current" && (
            <PowerCurrentForm onResult={setResult} />
          )}
          {activeId === "voltage-drop" && (
            <VoltageDropForm onResult={setResult} />
          )}
          {activeId === "cable-sizing" && (
            <CableSizingForm onResult={setResult} />
          )}
          {activeId === "max-demand" && (
            <MaxDemandForm onResult={setResult} />
          )}

          {result && (
            <div className="mt-4">
              <CalcResultView
                result={result}
                onSendToChat={() => onSendResultToChat(result)}
                onExplain={() => onExplainResult(result)}
                explainDisabled={explainDisabled}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
