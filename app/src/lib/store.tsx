import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import type { Carta, Item, NuevoItem, Tipo } from "./types";

const DATA = `${import.meta.env.BASE_URL}data/`;

async function cargarTodo(): Promise<Item[]> {
  const out: Item[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase.from("items").select("*").range(desde, desde + 999);
    if (error) throw error;
    out.push(...(data as Item[]));
    if (!data || data.length < 1000) return out;
  }
}

/** La primera vez que entras, sube el archivo importado del Excel. */
async function importarSemilla(): Promise<number> {
  const seed: NuevoItem[] = await fetch(`${DATA}seed.json`).then((r) => r.json());
  for (let i = 0; i < seed.length; i += 200) {
    const { error } = await supabase
      .from("items")
      .upsert(seed.slice(i, i + 200), { onConflict: "user_id,key", ignoreDuplicates: true });
    if (error) throw error;
  }
  return seed.length;
}

interface Store {
  items: Item[];
  cargando: boolean;
  error: string | null;
  guardar: (it: NuevoItem) => Promise<Item | null>;
  actualizar: (id: string, cambios: Partial<Item>) => Promise<void>;
  borrar: (id: string) => Promise<void>;
  mazo: (t: Exclude<Tipo, "book">) => Promise<Carta[]>;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mazos] = useState(() => new Map<string, Promise<Carta[]>>());

  useEffect(() => {
    (async () => {
      try {
        let todo = await cargarTodo();
        if (todo.length === 0) {
          await importarSemilla();
          todo = await cargarTodo();
        }
        setItems(todo);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const guardar = useCallback(async (it: NuevoItem) => {
    const { data, error } = await supabase
      .from("items")
      .upsert(it, { onConflict: "user_id,key" })
      .select()
      .single();
    if (error) {
      setError(error.message);
      return null;
    }
    const nuevo = data as Item;
    setItems((prev) => [...prev.filter((x) => x.id !== nuevo.id), nuevo]);
    return nuevo;
  }, []);

  const actualizar = useCallback(async (id: string, cambios: Partial<Item>) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...cambios } : x)));
    const { error } = await supabase.from("items").update(cambios).eq("id", id);
    if (error) setError(error.message);
  }, []);

  const borrar = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) setError(error.message);
  }, []);

  const mazo = useCallback(
    (t: Exclude<Tipo, "book">) => {
      if (!mazos.has(t)) mazos.set(t, fetch(`${DATA}pool-${t}.json`).then((r) => r.json()));
      return mazos.get(t)!;
    },
    [mazos],
  );

  const value = useMemo(
    () => ({ items, cargando, error, guardar, actualizar, borrar, mazo }),
    [items, cargando, error, guardar, actualizar, borrar, mazo],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore fuera de StoreProvider");
  return s;
}
