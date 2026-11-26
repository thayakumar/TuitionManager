"use client";
import { useId } from "react";
import {
  DateField,
  DateTimeField,
  TimeField,
  DurationField,
} from "@/components/scheduling-fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function Field({
  label,
  name,
  type = "text",
  timeLabel,
  defaultValue,
  required,
  step,
  placeholder,
  min,
  max,
  minLength,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  timeLabel?: string;
  defaultValue?: string | number;
  required?: boolean;
  step?: string;
  placeholder?: string;
  min?: number | string;
  max?: number | string;
  minLength?: number;
  autoComplete?: string;
}) {
  const fieldId = useId();
  if (type === "datetime-local")
    return (
      <DateTimeField
        name={name}
        label={label}
        timeLabel={timeLabel}
        defaultValue={String(defaultValue ?? "")}
        required={required}
      />
    );
  if (type === "date")
    return (
      <DateField
        name={name}
        label={label}
        defaultValue={String(defaultValue ?? "")}
        required={required}
      />
    );
  if (type === "time")
    return (
      <TimeField
        name={name}
        label={label}
        defaultValue={String(defaultValue ?? "09:00")}
        required={required}
      />
    );
  if (name === "duration_minutes")
    return <DurationField defaultValue={Number(defaultValue ?? 60)} />;
  return (
    <div className="field-group">
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        id={fieldId}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        step={step}
        min={min}
        max={max}
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
    </div>
  );
}

export function TextAreaField({
  label,
  name,
  defaultValue,
  rows = 3,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
}) {
  const fieldId = useId();
  return (
    <div className="field-group">
      <Label htmlFor={fieldId}>{label}</Label>
      <Textarea
        id={fieldId}
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={rows}
        placeholder={placeholder}
      />
    </div>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Array<{ value: string; label: string }>;
}) {
  const fieldId = useId();
  return (
    <div className="field-group">
      <Label htmlFor={fieldId}>{label}</Label>
      <select
        id={fieldId}
        name={name}
        defaultValue={defaultValue}
        className="flex min-h-11 w-full rounded-xl border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
