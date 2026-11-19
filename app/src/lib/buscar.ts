import { supabase } from "./supabase";
import type { Carta, Tipo } from "./types";

export interface Resultado extends Carta {
  o?: string | null;   // título original
  autor?: string;
}

async function buscarLibros(q: string): Promise<Resultado[]> {
  const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=12&fields=key,title,author_name,first_publish_year,cover_i`);
  const d = await r.json();
  return d.docs.map((x: { key: string; title: string; author_name?: string[]; first_publish_year?: number; cover_i?: number }) => ({
    k: `ol:${x.key}`,
    t: x.title,
    y: x.first_publish_year ?? null,
    c: x.cover_i ? `https://covers.openlibrary.org/b/id/${x.cover_i}-M.jpg` : null,
    autor: x.author_name?.[0],
  }));
}

/** Busca un título: libros en Open Library; pelis, series y juegos con la función "buscar" de Supabase. */
export async function buscar(tipo: Tipo, q: string): Promise<Resultado[]> {
  if (tipo === "book") return buscarLibros(q);
  const { data, error } = await supabase.functions.invoke("buscar", { body: { tipo, q } });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error(data?.error ?? "Respuesta inesperada");
  return data;
}
