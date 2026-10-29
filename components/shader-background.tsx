"use client";

import { useEffect, useRef } from "react";
import { startLiquidityField } from "@/lib/liquidity-field";

export function ShaderBackground() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => (canvas.current ? startLiquidityField(canvas.current) : undefined), []);
  return <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 -z-10 size-full" />;
}
