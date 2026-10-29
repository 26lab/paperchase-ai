import type { ButtonHTMLAttributes, ReactNode } from "react";

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(" ");

type Variant = "default" | "buy" | "sell" | "danger" | "ghost";
const variants: Record<Variant, string> = {
  default: "border-line-2 bg-white/[0.03] text-muted hover:text-fg hover:border-dim",
  ghost: "border-transparent text-muted hover:text-fg hover:bg-white/[0.04]",
  buy: "border-transparent bg-gradient-to-b from-[#3cf095] to-up-2 text-[#03200f] shadow-[0_12px_30px_-12px_var(--color-up)] font-bold",
  sell: "border-transparent bg-gradient-to-b from-[#ff6c79] to-down-2 text-[#2a0207] shadow-[0_12px_30px_-12px_var(--color-down)] font-bold",
  danger: "border-down/70 bg-down/10 text-down hover:bg-down/20 font-bold",
};

export function Button({ variant = "default", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-[background,color,border,transform] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

type Tone = "neutral" | "up" | "down" | "amber";
const tones: Record<Tone, string> = {
  neutral: "bg-line-2 text-muted",
  up: "bg-up/15 text-up",
  down: "bg-down/15 text-down",
  amber: "bg-amber/15 text-amber",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide", tones[tone])}>{children}</span>;
}

export function Dot({ tone }: { tone: Tone }) {
  const color = { neutral: "bg-dim", up: "bg-up shadow-[0_0_8px_var(--color-up)]", down: "bg-down shadow-[0_0_8px_var(--color-down)]", amber: "bg-amber" }[tone];
  return <span aria-hidden className={cx("inline-block size-2 rounded-full", color)} />;
}

export function Stat({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-xl border border-line px-3 py-2", className)}>
      <div className="font-display text-[10.5px] tracking-[0.12em] text-dim uppercase">{label}</div>
      <div className="tabular mt-0.5 text-[13px]">{children}</div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="grid h-full min-h-20 place-items-center text-center text-sm text-dim">{children}</div>;
}

export const pnlTone = (value: number | undefined): Tone => (value === undefined || value === 0 ? "neutral" : value > 0 ? "up" : "down");
export const pnlText = (value: number | undefined) => (value === undefined || value === 0 ? "text-muted" : value > 0 ? "text-up" : "text-down");
export { cx };
