import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "odd-analyzer",
  description: "Valor = modelo vs odd de-vig. Só sinaliza quando o modelo está à frente.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        <header className="border-b border-neutral-200 bg-white">
          <nav className="mx-auto max-w-5xl flex items-center gap-6 px-4 py-3">
            <span className="font-semibold tracking-tight">⚽ odd-analyzer</span>
            <Link href="/" className="text-sm text-neutral-600 hover:text-neutral-900">Pré-jogo</Link>
            <Link href="/pos" className="text-sm text-neutral-600 hover:text-neutral-900">Pós-jogo</Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-neutral-200 py-3 text-center text-xs text-neutral-400">
          Valor = prob. do modelo vs odd de-vig. Nunca aposta por “probabilidade alta”.
        </footer>
      </body>
    </html>
  );
}
