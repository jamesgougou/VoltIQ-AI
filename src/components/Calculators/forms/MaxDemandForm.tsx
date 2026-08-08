"use client";

import { useState } from "react";
import { calculateMaxDemand, type CalcResult } from "@/lib/calculators";
import { NumberField, TextField, parseOptionalNumber } from "../formFields";

type MaxDemandFormProps = {
  onResult: (result: CalcResult) => void;
};

type LoadRow = {
  name: string;
  loadA: string;
  diversityFactor: string;
};

const emptyRow = (): LoadRow => ({
  name: "",
  loadA: "",
  diversityFactor: "",
});

export function MaxDemandForm({ onResult }: MaxDemandFormProps) {
  const [loads, setLoads] = useState<LoadRow[]>([emptyRow(), emptyRow()]);

  function updateRow(index: number, patch: Partial<LoadRow>) {
    setLoads((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
  }

  function handleCalculate() {
    onResult(
      calculateMaxDemand({
        loads: loads.map((row) => ({
          name: row.name,
          loadA: parseOptionalNumber(row.loadA),
          diversityFactor: parseOptionalNumber(row.diversityFactor),
        })),
      }),
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500">
        Enter each load with an explicit diversity factor. No default diversity
        is applied.
      </p>

      {loads.map((row, index) => (
        <div
          key={`load-${index}`}
          className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-3"
        >
          <TextField
            label={`Load ${index + 1} name`}
            value={row.name}
            onChange={(value) => updateRow(index, { name: value })}
          />
          <NumberField
            label="Load current"
            unit="A"
            value={row.loadA}
            onChange={(value) => updateRow(index, { loadA: value })}
            min={0}
          />
          <NumberField
            label="Diversity factor"
            value={row.diversityFactor}
            onChange={(value) => updateRow(index, { diversityFactor: value })}
            min={0}
            step="0.01"
          />
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setLoads((current) => [...current, emptyRow()])}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Add load
        </button>
        <button
          type="button"
          onClick={handleCalculate}
          className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
        >
          Calculate maximum demand
        </button>
      </div>
    </div>
  );
}
