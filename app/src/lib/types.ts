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

export const TIPOS: { id: Tipo; nombre: string; plural: string }[] = [
  { id: "movie", nombre: "Película", plural: "Películas" },
  { id: "series", nombre: "Serie", plural: "Series" },
  { id: "game", nombre: "Juego", plural: "Juegos" },
  { id: "book", nombre: "Libro", plural: "Libros" },
];

/**
 * Escala de color de las notas (dos tonos por color):
 * 0–4 rojo · 5–6 naranja · 7–8 amarillo · 9–9,5 verde · 10 estrella celeste.
 */
export function escalaNota(n: number): { bg: string; fg: string; nivel: string } {
  if (n >= 10) return { bg: "#7cc8f2", fg: "#06121a", nivel: "diez" };
  if (n >= 9.5) return { bg: "#5bd88a", fg: "#04140a", nivel: "verde-claro" };
  if (n >= 9) return { bg: "#22a45d", fg: "#f3fff7", nivel: "verde" };
  if (n >= 8) return { bg: "#f5d64a", fg: "#1c1600", nivel: "amarillo-claro" };
  if (n >= 7) return { bg: "#d9a514", fg: "#1c1400", nivel: "amarillo" };
  if (n >= 6) return { bg: "#f59a4a", fg: "#1f0d00", nivel: "naranja-claro" };
  if (n >= 5) return { bg: "#df6a1c", fg: "#fff6ef", nivel: "naranja" };
  if (n >= 2.5) return { bg: "#e5484d", fg: "#fff4f4", nivel: "rojo-claro" };
  return { bg: "#a3262b", fg: "#fff0f0", nivel: "rojo" };
}

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

/** Tramos de nota para filtrar: 10 · 9 (9–9,5) · 8 · 7 · 6 · 5 o menos (≤5,5). */
export type Tramo = 10 | 9 | 8 | 7 | 6 | 5;
export const TRAMOS: { id: Tramo; nombre: string }[] = [
  { id: 10, nombre: "10" }, { id: 9, nombre: "9" }, { id: 8, nombre: "8" },
  { id: 7, nombre: "7" }, { id: 6, nombre: "6" }, { id: 5, nombre: "5 o menos" },
];
export function tramoDe(n: number): Tramo {
  if (n >= 10) return 10;
  if (n >= 9) return 9;
  if (n >= 8) return 8;
  if (n >= 7) return 7;
  if (n >= 6) return 6;
  return 5;
}
