"use client";

import { useState } from "react";
import { calculateVoltageDrop, type CalcResult } from "@/lib/calculators";
import { NumberField, parseOptionalNumber } from "../formFields";

type VoltageDropFormProps = {
  onResult: (result: CalcResult) => void;
};

export function VoltageDropForm({ onResult }: VoltageDropFormProps) {
  const [currentA, setCurrentA] = useState("");
  const [resistanceOhm, setResistanceOhm] = useState("");
  const [impedanceOhm, setImpedanceOhm] = useState("");
  const [resistancePerKmOhm, setResistancePerKmOhm] = useState("");
  const [impedancePerKmOhm, setImpedancePerKmOhm] = useState("");
  const [lengthM, setLengthM] = useState("");
  const [systemVoltageV, setSystemVoltageV] = useState("");

  function handleCalculate() {
    onResult(
      calculateVoltageDrop({
        currentA: parseOptionalNumber(currentA),
        resistanceOhm: parseOptionalNumber(resistanceOhm),
        impedanceOhm: parseOptionalNumber(impedanceOhm),
        resistancePerKmOhm: parseOptionalNumber(resistancePerKmOhm),
        impedancePerKmOhm: parseOptionalNumber(impedancePerKmOhm),
        lengthM: parseOptionalNumber(lengthM),
        systemVoltageV: parseOptionalNumber(systemVoltageV),
      }),
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500">
        Provide total R or Z, or per-km values with length. Cable ohms are never
        invented.
      </p>
      <NumberField label="Current" unit="A" value={currentA} onChange={setCurrentA} min={0} />
      <NumberField
        label="Total resistance R"
        unit="Ω"
        value={resistanceOhm}
        onChange={setResistanceOhm}
        min={0}
        optional
      />
      <NumberField
        label="Total impedance Z"
        unit="Ω"
        value={impedanceOhm}
        onChange={setImpedanceOhm}
        min={0}
        optional
      />
      <NumberField
        label="Resistance per km"
        unit="Ω/km"
        value={resistancePerKmOhm}
        onChange={setResistancePerKmOhm}
        min={0}
        optional
      />
      <NumberField
        label="Impedance per km"
        unit="Ω/km"
        value={impedancePerKmOhm}
        onChange={setImpedancePerKmOhm}
        min={0}
        optional
      />
      <NumberField
        label="Length"
        unit="m"
        value={lengthM}
        onChange={setLengthM}
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
        Calculate
      </button>
    </div>
  );
}
