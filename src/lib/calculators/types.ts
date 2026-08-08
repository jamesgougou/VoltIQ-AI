export type CalculatorId =
  | "power-current"
  | "voltage-drop"
  | "cable-sizing"
  | "max-demand";

export type CalcPhaseSystem = "single-phase" | "three-phase";

export type CalcInputValue = {
  key: string;
  label: string;
  value: string | number;
  unit?: string;
};

export type CalcResult = {
  calculatorId: CalculatorId;
  title: string;
  ok: boolean;
  formula: string;
  inputsUsed: CalcInputValue[];
  results: CalcInputValue[];
  assumptions: string[];
  missingInputs: string[];
  notes?: string[];
};

export type PowerCurrentMode =
  | "power-from-vi"
  | "current-from-pv"
  | "kva-from-kw-pf"
  | "kw-from-kva-pf";

export type PowerCurrentInput = {
  mode: PowerCurrentMode;
  phaseSystem?: CalcPhaseSystem;
  voltageV?: number;
  currentA?: number;
  powerW?: number;
  powerKw?: number;
  apparentPowerKva?: number;
  powerFactor?: number;
};

export type VoltageDropInput = {
  currentA?: number;
  resistanceOhm?: number;
  impedanceOhm?: number;
  lengthM?: number;
  resistancePerKmOhm?: number;
  impedancePerKmOhm?: number;
  systemVoltageV?: number;
};

export type CableSizingInput = {
  designCurrentA?: number;
  material?: "copper" | "aluminium";
  arrangement?: string;
  installationMethod?: string;
  currentCarryingCapacityA?: number;
  deratingFactors?: number[];
  voltageDropLimitPercent?: number;
  calculatedVoltageDropPercent?: number;
  circuitImpedanceOhm?: number;
  systemVoltageV?: number;
  lengthM?: number;
};

export type MaxDemandLoad = {
  name: string;
  loadA?: number;
  diversityFactor?: number;
};

export type MaxDemandInput = {
  loads?: MaxDemandLoad[];
};
