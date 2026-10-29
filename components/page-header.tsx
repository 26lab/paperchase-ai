import type { ReactNode } from "react";

export function PageHeader({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[26px] font-semibold tracking-tight">{title}</h1>
        {children && <p className="mt-1 max-w-2xl text-muted">{children}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-[var(--radius-tile)] border border-line bg-panel/80 p-4 backdrop-blur-md">
      {title && <h2 className="mb-3 font-display text-[11.5px] font-semibold tracking-[0.14em] text-muted uppercase">{title}</h2>}
      {children}
    </section>
  );
}
