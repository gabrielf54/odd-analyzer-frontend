export interface BookMeta {
  sigla: string;   // "KTO", "BET", "MAN"
  label: string;   // nome legível
  dotClass: string;  // classe Tailwind do ponto/fundo
  textClass: string; // classe Tailwind do texto
}

const KNOWN: Record<string, BookMeta> = {
  kto:         { sigla: "KTO", label: "KTO",         dotClass: "bg-[#25e08a]", textClass: "text-[#25e08a]" },
  betnacional: { sigla: "BET", label: "Betnacional", dotClass: "bg-[#3b9dff]", textClass: "text-[#3b9dff]" },
  manual:      { sigla: "MAN", label: "Manual",      dotClass: "bg-[#8a8a8a]", textClass: "text-[#8a8a8a]" },
};

/** Mapeia o nome da casa para sigla + cores. Fallback p/ casa desconhecida:
 *  3 primeiras letras + cinza neutro. null/undefined => manual. */
export function bookMeta(book?: string | null): BookMeta {
  const key = (book ?? "manual").trim().toLowerCase();
  if (KNOWN[key]) return KNOWN[key];
  const sigla = key.slice(0, 3).toUpperCase() || "MAN";
  return { sigla, label: key || "manual", dotClass: "bg-[#8a8a8a]", textClass: "text-[#8a8a8a]" };
}
