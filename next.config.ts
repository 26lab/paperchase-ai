import type { NextConfig } from "next";

const config: NextConfig = {
  // Static export: Electron serves out/ through the app:// protocol, no Node server at runtime.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // Type checking runs via `npm run typecheck` (TypeScript 7), not inside next build.
  typescript: { ignoreBuildErrors: true },
};

export default config;
