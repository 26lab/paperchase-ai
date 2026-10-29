"use client";

import { Activity, Bot, LayoutDashboard, ListOrdered, Radar, Settings, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBridge } from "@/lib/bridge-data";
import { usePreflight } from "@/lib/preflight";
import { Logo } from "../logo";
import { Badge, cx, Dot } from "../ui";

export const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders/", label: "Orders & Historie", icon: ListOrdered },
  { href: "/bot/", label: "Bot", icon: Radar },
  { href: "/claude/", label: "Claude", icon: Bot },
  { href: "/safety/", label: "Sicherheit", icon: ShieldCheck },
  { href: "/system/", label: "System-Check", icon: Activity },
  { href: "/settings/", label: "Einstellungen", icon: Settings },
] as const;

function ConnectionCard() {
  const { connected, risk, status } = useBridge();
  return (
    <div className="mt-auto rounded-2xl border border-line p-3 text-xs text-muted">
      <div className="flex items-center gap-2 font-semibold text-fg">
        <Dot tone={connected ? "up" : "down"} />
        {connected ? "Bridge verbunden" : "Bridge getrennt"}
      </div>
      <div className="mt-1.5">Konto: {risk?.account ?? "–"}</div>
      <div>Instrument: {status?.instrument ?? "–"}</div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { checks, blocked } = usePreflight();
  const warnings = checks.filter((c) => c.state !== "ok").length;

  return (
    <nav aria-label="Hauptnavigation" className="flex w-60 shrink-0 flex-col gap-1 border-r border-line bg-ink-2/70 px-3 pt-4 pb-4 backdrop-blur-xl">
      <div className="drag-region px-3 pb-6">
        <Logo />
      </div>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cx("relative flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition-colors", active ? "text-up" : "text-muted hover:bg-white/[0.03] hover:text-fg")}
          >
            {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-up/[0.08] ring-1 ring-up/20" />}
            <Icon className="relative size-[18px]" aria-hidden />
            <span className="relative">{label}</span>
            {href === "/system/" && warnings > 0 && (
              <span className="relative ml-auto">
                <Badge tone={blocked ? "down" : "amber"}>{warnings}</Badge>
              </span>
            )}
          </Link>
        );
      })}
      <ConnectionCard />
    </nav>
  );
}
