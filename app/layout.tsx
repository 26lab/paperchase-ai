import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { ShaderBackground } from "@/components/shader-background";
import { Shell } from "@/components/shell/shell";
import { ToastProvider } from "@/lib/toast";
import "./globals.css";

// next/font downloads at build time and self-hosts, so the app works offline.
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken" });
const chakra = Chakra_Petch({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-chakra" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });

export const metadata: Metadata = { title: "PaperChase AI", description: "ATAS-Cockpit mit Claude" };
export const viewport: Viewport = { themeColor: "#050d0b", colorScheme: "dark" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className={`${hanken.variable} ${chakra.variable} ${plexMono.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-panel-2 focus:px-3 focus:py-2">
          Zum Inhalt springen
        </a>
        <ShaderBackground />
        <ToastProvider>
          <Shell>{children}</Shell>
        </ToastProvider>
      </body>
    </html>
  );
}
