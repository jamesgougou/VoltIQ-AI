"use client";

import { useState } from "react";
import { calculateCableSizing, type CalcResult } from "@/lib/calculators";
import {
  NumberField,
  SelectField,
  TextField,
  parseOptionalNumber,
} from "../formFields";

type CableSizingFormProps = {
  onResult: (result: CalcResult) => void;
};

export function CableSizingForm({ onResult }: CableSizingFormProps) {
  const [designCurrentA, setDesignCurrentA] = useState("");
  const [material, setMaterial] = useState("");
  const [arrangement, setArrangement] = useState("");
  const [installationMethod, setInstallationMethod] = useState("");
  const [currentCarryingCapacityA, setCurrentCarryingCapacityA] = useState("");
  const [deratingFactors, setDeratingFactors] = useState("");
  const [voltageDropLimitPercent, setVoltageDropLimitPercent] = useState("");
  const [calculatedVoltageDropPercent, setCalculatedVoltageDropPercent] =
    useState("");
  const [circuitImpedanceOhm, setCircuitImpedanceOhm] = useState("");
  const [systemVoltageV, setSystemVoltageV] = useState("");

  function handleCalculate() {
    const factors = deratingFactors
      .split(/[,x×\s]+/i)
      .map((part) => part.trim())
      .filter(Boolean)
      .map(Number)
      .filter((value) => Number.isFinite(value));

    onResult(
      calculateCableSizing({
        designCurrentA: parseOptionalNumber(designCurrentA),
        material:
          material === "copper" || material === "aluminium"
            ? material
            : undefined,
        arrangement,
        installationMethod,
        currentCarryingCapacityA: parseOptionalNumber(currentCarryingCapacityA),
        deratingFactors: factors.length > 0 ? factors : undefined,
        voltageDropLimitPercent: parseOptionalNumber(voltageDropLimitPercent),
        calculatedVoltageDropPercent: parseOptionalNumber(
          calculatedVoltageDropPercent,
        ),
        circuitImpedanceOhm: parseOptionalNumber(circuitImpedanceOhm),
        systemVoltageV: parseOptionalNumber(systemVoltageV),
      }),
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500">
        Framework only — enter CCC, derating and Vd data from your tables. No
        AS/NZS 3008 cable table is embedded.
      </p>
      <NumberField
        label="Design current Ib"
        unit="A"
        value={designCurrentA}
        onChange={setDesignCurrentA}
        min={0}
      />
      <SelectField
        label="Conductor material"
        value={material}
        onChange={setMaterial}
        options={[
          { value: "", label: "Select material…" },
          { value: "copper", label: "Copper" },
          { value: "aluminium", label: "Aluminium" },
        ]}
      />
      <TextField
        label="Conductor arrangement"
        value={arrangement}
        onChange={setArrangement}
        placeholder="e.g. multicore, single-core trefoil"
      />
      <TextField
        label="Installation method / conditions"
        value={installationMethod}
        onChange={setInstallationMethod}
        placeholder="e.g. clipped direct, underground"
      />
      <NumberField
        label="Current-carrying capacity Iz"
        unit="A"
        value={currentCarryingCapacityA}
        onChange={setCurrentCarryingCapacityA}
        min={0}
      />
      <TextField
        label="Derating factors"
        value={deratingFactors}
        onChange={setDeratingFactors}
        placeholder="e.g. 0.9 × 0.95"
      />
      <NumberField
        label="Allowable voltage drop limit"
        unit="%"
        value={voltageDropLimitPercent}
        onChange={setVoltageDropLimitPercent}
        min={0}
      />
      <NumberField
        label="Calculated voltage drop"
        unit="%"
        value={calculatedVoltageDropPercent}
        onChange={setCalculatedVoltageDropPercent}
        min={0}
        optional
      />
      <NumberField
        label="Circuit impedance Z"
        unit="Ω"
        value={circuitImpedanceOhm}
        onChange={setCircuitImpedanceOhm}
        min={0}
        optional
      />
      <NumberField
        label="System voltage"
        unit="V"
        value={systemVoltageV}
        onChange={setSystemVoltageV}
        min={0}
        optional
      />
      <button
        type="button"
        onClick={handleCalculate}
        className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
      >
        Assess cable framework
      </button>
    </div>
  );
}
