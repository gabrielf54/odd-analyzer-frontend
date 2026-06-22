import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmDialog";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "odd-analyzer — value terminal",
  description: "Valor = modelo vs odd de-vig. Só sinaliza quando o modelo está à frente.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${mono.variable}`}>
      <body className="min-h-screen">
        <ToastProvider>
        <ConfirmProvider>
        <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 items-center justify-center">
                <span className="h-2.5 w-2.5 rounded-full bg-value shadow-[0_0_10px_2px_rgba(37,224,138,0.7)]" />
              </span>
              <span className="display text-[15px] font-extrabold tracking-tight text-fg">
                odd<span className="text-value">/</span>analyzer
              </span>
              <span className="overline ml-1 hidden sm:inline">value terminal</span>
            </div>
            <nav className="ml-auto flex items-center gap-4">
              <a href="/" className="overline text-faint transition-colors hover:text-fg">jogos</a>
              <a href="/agendador" className="overline text-faint transition-colors hover:text-fg">agendador</a>
              <span className="hidden items-center gap-2 md:flex">
                <span className="overline">copa 2026</span>
                <span className="text-value">●</span>
                <span className="overline text-faint">live<span className="blink text-value">_</span></span>
              </span>
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-5 py-8">{children}</main>

        <footer className="mx-auto max-w-6xl px-5 pb-10 pt-6">
          <div className="border-t border-line-soft pt-4 overline leading-relaxed text-faint">
            valor = prob. do modelo &gt; prob. justa da casa sem margem (de-vig).
            <br className="sm:hidden" /> nunca se aposta por “probabilidade alta”. a ia explica, nunca inventa o número.
          </div>
        </footer>
        </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
