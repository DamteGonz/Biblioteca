export type Tipo = "game" | "movie" | "series" | "book";
export type Estado = "visto" | "pendiente" | "en_curso" | "en_emision" | "no_visto" | "no_recuerdo";

export interface Historial {
  year: number;
  rating: number | null;
  note?: string | null;
}

export interface Item {
  id: string;
  key: string;
  type: Tipo;
  title: string;
  original_title: string | null;
  cover: string | null;
  release_year: number | null;
  status: Estado;
  rating: number | null;
  years: number[];
  pre2021: boolean;
  history: Historial[];
  anime: boolean;
  dlc_of: string | null;
  hackrom: boolean;
  hours: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type NuevoItem = Partial<Item> & Pick<Item, "key" | "type" | "title" | "status">;

/** Elemento de los mazos para deslizar. */
export interface Carta {
  k: string;
  t: string;
  y: number | null;
  c: string | null;
}

export const TIPOS: { id: Tipo; nombre: string; plural: string; icono: string }[] = [
  { id: "movie", nombre: "Película", plural: "Películas", icono: "🎬" },
  { id: "series", nombre: "Serie", plural: "Series", icono: "📺" },
  { id: "game", nombre: "Juego", plural: "Juegos", icono: "🎮" },
  { id: "book", nombre: "Libro", plural: "Libros", icono: "📚" },
];

export const ESTADOS: Record<Estado, string> = {
  visto: "Visto",
  pendiente: "Pendiente",
  en_curso: "A medias",
  en_emision: "En emisión",
  no_visto: "No visto",
  no_recuerdo: "No lo recuerdo",
};

export const tipoInfo = (t: Tipo) => TIPOS.find((x) => x.id === t)!;

export const verbo = (t: Tipo) => (t === "game" ? "jugado" : t === "book" ? "leído" : "visto");

export const AÑO_ACTUAL = new Date().getFullYear();
export const AÑOS = Array.from({ length: AÑO_ACTUAL - 2020 }, (_, i) => AÑO_ACTUAL - i);

export const fmtNota = (n: number | null | undefined) =>
  n == null ? "–" : Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");

/** Nota de un elemento en un año concreto (para series: la review de ese año, si la hay). */
export function notaEnAño(it: Item, año: number | "pre"): number | null {
  if (año !== "pre") {
    const h = [...it.history].reverse().find((e) => e.year === año && e.rating != null);
    if (h && it.type === "series") return h.rating;
  }
  return it.rating;
}
