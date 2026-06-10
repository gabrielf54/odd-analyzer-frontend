"use client";

import { useEffect, useState } from "react";

// SSR-safe: inicia com `initial`, hidrata do localStorage no mount (evita
// mismatch de hidratação). Escreve a cada set.
export function useLocalStorage<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // localStorage indisponível ou JSON corrompido — mantém `initial`
    }
  }, [key]);

  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      // ignora falha de escrita (quota / modo privado)
    }
  };

  return [value, set];
}
