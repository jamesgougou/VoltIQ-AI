"use client";

type NumberFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  optional?: boolean;
  min?: number;
  step?: string;
};

export function NumberField({
  label,
  value,
  onChange,
  unit,
  optional = false,
  min,
  step = "any",
}: NumberFieldProps) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      {optional ? " (optional)" : ""}
      {unit ? ` · ${unit}` : ""}
      <input
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900"
      />
    </label>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  placeholder?: string;
};

export function TextField({
  label,
  value,
  onChange,
  optional = false,
  placeholder,
}: TextFieldProps) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      {optional ? " (optional)" : ""}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900"
      />
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
};

export function SelectField({
  label,
  value,
  onChange,
  options,
}: SelectFieldProps) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}
