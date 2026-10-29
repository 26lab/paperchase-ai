"use client";

import { Minus, Plus } from "lucide-react";
import { useId } from "react";
import { cx } from "./ui";

interface StepperProps {
  id: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
  min?: number;
  max?: number;
  suffix?: string;
}

export function Stepper({ id, value, onChange, step, min = 0, max = Infinity, suffix }: StepperProps) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  return (
    <div className="flex items-center overflow-hidden rounded-xl border border-line bg-black/20 focus-within:border-up/50">
      <input
        id={id}
        name={id}
        type="number"
        autoComplete="off"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : ""}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        onBlur={() => onChange(clamp(value))}
        className="tabular w-24 bg-transparent px-3 py-2 text-[15px] outline-none"
      />
      {suffix && <span className="pr-2 text-xs text-dim">{suffix}</span>}
      <button type="button" aria-label="Weniger" onClick={() => onChange(clamp(value - step))} className="grid size-9 place-items-center border-l border-line text-muted hover:text-fg">
        <Minus className="size-4" />
      </button>
      <button type="button" aria-label="Mehr" onClick={() => onChange(clamp(value + step))} className="grid size-9 place-items-center border-l border-line text-muted hover:text-fg">
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span className="absolute inset-0 rounded-full bg-line-2 transition-colors peer-checked:bg-up-2 peer-focus-visible:outline-2 peer-focus-visible:outline-up" />
      <span className="absolute left-[3px] size-[18px] rounded-full bg-fg transition-transform peer-checked:translate-x-5" />
    </label>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string; tone?: "up" | "down" }[];
  value: T;
  onChange: (value: T) => void;
}

/** Native radio group styled as a segmented control. */
export function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  const name = useId();
  return (
    <fieldset className="flex gap-1 rounded-xl border border-line p-1">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <label key={option.value} className="flex-1">
          <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} className="peer sr-only" />
          <span
            className={cx(
              "block cursor-pointer rounded-[10px] py-1.5 text-center text-sm font-semibold text-muted transition-colors hover:text-fg peer-focus-visible:outline-2 peer-focus-visible:outline-up",
              option.tone === "up" && "peer-checked:bg-up/12 peer-checked:text-up",
              option.tone === "down" && "peer-checked:bg-down/12 peer-checked:text-down",
              !option.tone && "peer-checked:bg-white/[0.08] peer-checked:text-fg",
            )}
          >
            {option.label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
