"use client";

import { useState } from "react";
import {
  calculatePowerCurrent,
  type CalcResult,
  type PowerCurrentMode,
} from "@/lib/calculators";
import {
  NumberField,
  SelectField,
  parseOptionalNumber,
} from "../formFields";

type PowerCurrentFormProps = {
  onResult: (result: CalcResult) => void;
};

export function PowerCurrentForm({ onResult }: PowerCurrentFormProps) {
  const [mode, setMode] = useState<PowerCurrentMode | "">("power-from-vi");
  const [phaseSystem, setPhaseSystem] = useState("");
  const [voltageV, setVoltageV] = useState("");
  const [currentA, setCurrentA] = useState("");
  const [powerW, setPowerW] = useState("");
  const [powerKw, setPowerKw] = useState("");
  const [apparentPowerKva, setApparentPowerKva] = useState("");
  const [powerFactor, setPowerFactor] = useState("");

  function handleCalculate() {
    onResult(
      calculatePowerCurrent({
        mode: (mode || undefined) as PowerCurrentMode,
        phaseSystem:
          phaseSystem === "single-phase" || phaseSystem === "three-phase"
            ? phaseSystem
            : undefined,
        voltageV: parseOptionalNumber(voltageV),
        currentA: parseOptionalNumber(currentA),
        powerW: parseOptionalNumber(powerW),
        powerKw: parseOptionalNumber(powerKw),
        apparentPowerKva: parseOptionalNumber(apparentPowerKva),
        powerFactor: parseOptionalNumber(powerFactor),
      }),
    );
  }

  const needsPhase = mode === "power-from-vi" || mode === "current-from-pv";

  return (
    <div className="space-y-3">
      <SelectField
        label="Calculation mode"
        value={mode}
        onChange={(value) => setMode(value as PowerCurrentMode | "")}
        options={[
          { value: "", label: "Select mode…" },
          { value: "power-from-vi", label: "Power from V and I" },
          { value: "current-from-pv", label: "Current from P and V" },
          { value: "kva-from-kw-pf", label: "kVA from kW and pf" },
          { value: "kw-from-kva-pf", label: "kW from kVA and pf" },
        ]}
      />

      {needsPhase && (
        <SelectField
          label="Phase system"
          value={phaseSystem}
          onChange={setPhaseSystem}
          options={[
            { value: "", label: "Select phase system…" },
            { value: "single-phase", label: "Single-phase" },
            { value: "three-phase", label: "Three-phase" },
          ]}
        />
      )}

      {(mode === "power-from-vi" || mode === "current-from-pv") && (
        <NumberField label="Voltage" unit="V" value={voltageV} onChange={setVoltageV} min={0} />
      )}

      {mode === "power-from-vi" && (
        <NumberField label="Current" unit="A" value={currentA} onChange={setCurrentA} min={0} />
      )}

      {mode === "current-from-pv" && (
        <>
          <NumberField label="Power" unit="W" value={powerW} onChange={setPowerW} min={0} optional />
          <NumberField label="Power" unit="kW" value={powerKw} onChange={setPowerKw} min={0} optional />
        </>
      )}

      {mode === "kva-from-kw-pf" && (
        <NumberField label="Real power" unit="kW" value={powerKw} onChange={setPowerKw} min={0} />
      )}

      {mode === "kw-from-kva-pf" && (
        <NumberField
          label="Apparent power"
          unit="kVA"
          value={apparentPowerKva}
          onChange={setApparentPowerKva}
          min={0}
        />
      )}

      {(mode === "kva-from-kw-pf" ||
        mode === "kw-from-kva-pf" ||
        phaseSystem === "three-phase") && (
        <NumberField
          label="Power factor"
          value={powerFactor}
          onChange={setPowerFactor}
          min={0}
          step="0.01"
        />
      )}

      <button
        type="button"
        onClick={handleCalculate}
        className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
      >
        Calculate
      </button>
    </div>
  );
}
