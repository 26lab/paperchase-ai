const formatters = new Map<number, Intl.NumberFormat>();

export function num(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  let formatter = formatters.get(digits);
  if (!formatter) {
    formatter = new Intl.NumberFormat("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
    formatters.set(digits, formatter);
  }
  return formatter.format(value);
}

/** Price digits follow the tick size: 0.25 → 2 digits, 1 → 0 digits. */
export const priceDigits = (tick: number) => (tick > 0 && tick < 1 ? 2 : 0);

export const signed = (value: number, digits = 2) => `${value > 0 ? "+" : ""}${num(value, digits)}`;

export const usd = (value: number | null | undefined) => (value === null || value === undefined ? "–" : `${signed(value)} $`);

export const time = (iso: string) => new Date(iso).toLocaleTimeString("de-DE");
