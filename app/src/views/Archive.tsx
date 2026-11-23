import { useMemo, useState } from "react";
import { Cover } from "../components/Cover";
import { Icon } from "../components/Icon";
import { NotaBadge } from "../components/RatingPicker";
import { useStore } from "../lib/store";
import { AÑOS, ESTADOS, TIPOS, TRAMOS, escalaNota, notaEnAño, tramoDe, type Tramo, type Estado, type Item, type Tipo } from "../lib/types";

type Periodo = "todo" | "pre" | number;
type Filtro = "vistos" | "pendientes" | "a_medias" | "sin_nota";
type Orden = "nota" | "titulo" | "reciente" | "estreno";

const FILTROS: { id: Filtro; nombre: string; estados: Estado[] }[] = [
  { id: "vistos", nombre: "Vistos", estados: ["visto", "en_curso", "en_emision"] },
  { id: "pendientes", nombre: "Pendientes", estados: ["pendiente"] },
  { id: "a_medias", nombre: "A medias", estados: ["en_curso", "en_emision"] },
  { id: "sin_nota", nombre: "Sin nota", estados: ["visto", "en_curso", "en_emision"] },
];

export function Archive({ onAbrir }: { onAbrir: (it: Item) => void }) {
  const { items } = useStore();
  const [tipo, setTipo] = useState<Tipo | "todo">("todo");
  const [periodo, setPeriodo] = useState<Periodo>("todo");
  const [filtro, setFiltro] = useState<Filtro>("vistos");
  const [orden, setOrden] = useState<Orden>("nota");
  const [tramo, setTramo] = useState<Tramo | null>(null);
  const [q, setQ] = useState("");

  const lista = useMemo(() => {
    const f = FILTROS.find((x) => x.id === filtro)!;
    const texto = q.trim().toLowerCase();
    const res = items.filter((it) => {
      if (tipo !== "todo" && it.type !== tipo) return false;
      if (!f.estados.includes(it.status)) return false;
      if (filtro === "sin_nota" && it.rating != null) return false;
      if (tramo != null) {
        const n = typeof periodo === "number" ? notaEnAño(it, periodo) : it.rating;
        if (n == null || tramoDe(n) !== tramo) return false;
      }
      if (periodo === "pre" && !it.pre2021) return false;
      if (typeof periodo === "number" && !it.years.includes(periodo)) return false;
      if (texto && !`${it.title} ${it.original_title ?? ""}`.toLowerCase().includes(texto)) return false;
      return true;
    });
    const nota = (it: Item) => (typeof periodo === "number" ? notaEnAño(it, periodo) : it.rating) ?? -1;
    res.sort((a, b) =>
      orden === "nota" ? nota(b) - nota(a) || a.title.localeCompare(b.title)
      : orden === "titulo" ? a.title.localeCompare(b.title)
      : orden === "estreno" ? (b.release_year ?? 0) - (a.release_year ?? 0)
      : b.updated_at.localeCompare(a.updated_at),
    );
    return res;
  }, [items, tipo, periodo, filtro, orden, q, tramo]);

  const media = useMemo(() => {
    const n = lista.map((it) => (typeof periodo === "number" ? notaEnAño(it, periodo) : it.rating)).filter((x): x is number => x != null);
    return n.length ? (n.reduce((a, b) => a + b, 0) / n.length).toFixed(2).replace(".", ",") : null;
  }, [lista, periodo]);

  return (
    <section className="archivo">
      <header className="cabecera">
        <p className="eyebrow">Biblioteca personal</p>
        <h1>Archivo<sup>{lista.length}</sup></h1>
        <label className="buscar">
          <Icon name="buscar" size={18} />
          <input type="search" placeholder="Buscar un título" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        </label>
      </header>

      <div className="chips" role="tablist" aria-label="Tipo">
        <button className={`chip ${tipo === "todo" ? "on" : ""}`} onClick={() => setTipo("todo")}>Todo</button>
        {TIPOS.map((t) => (
          <button key={t.id} className={`chip ${tipo === t.id ? "on" : ""}`} onClick={() => setTipo(t.id)}>
            {t.plural}
          </button>
        ))}
      </div>

      <div className="chips" aria-label="Periodo">
        <button className={`chip suave ${periodo === "todo" ? "on" : ""}`} onClick={() => setPeriodo("todo")}>Toda mi vida</button>
        {AÑOS.map((a) => (
          <button key={a} className={`chip suave ${periodo === a ? "on" : ""}`} onClick={() => setPeriodo(a)}>{a}</button>
        ))}
        <button className={`chip suave ${periodo === "pre" ? "on" : ""}`} onClick={() => setPeriodo("pre")}>Antes de 2021</button>
      </div>

      {filtro !== "pendientes" && (
        <div className="chips" aria-label="Nota">
          <button className={`chip suave ${tramo == null ? "on" : ""}`} onClick={() => setTramo(null)}>Todas las notas</button>
          {TRAMOS.map((t) => (
            <button key={t.id} className={`chip suave chip-nota ${tramo === t.id ? "on" : ""}`} onClick={() => setTramo(tramo === t.id ? null : t.id)}
              style={{ ["--nota-bg" as string]: escalaNota(t.id === 5 ? 5 : t.id).bg }}>
              <span className="punto" aria-hidden="true" />{t.id === 10 ? "★ 10" : t.nombre}
            </button>
          ))}
        </div>
      )}

      <div className="fila-controles">
        <div className="segmentado">
          {FILTROS.map((f) => (
            <button key={f.id} className={filtro === f.id ? "on" : ""} onClick={() => setFiltro(f.id)}>{f.nombre}</button>
          ))}
        </div>
        <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)} aria-label="Ordenar">
          <option value="nota">Por nota</option>
          <option value="titulo">A–Z</option>
          <option value="estreno">Por estreno</option>
          <option value="reciente">Últimos cambios</option>
        </select>
      </div>

      <p className="resumen-lista">
        <span>{lista.length} {lista.length === 1 ? "título" : "títulos"}</span>
        {media && filtro !== "pendientes" && <span>Media <strong>{media}</strong></span>}
      </p>

      {lista.length === 0 ? (
        <p className="vacio">No hay nada aquí todavía.</p>
      ) : (
        <ul className="rejilla">
          {lista.map((it) => (
            <li key={it.id}>
              <button className="tarjeta" onClick={() => onAbrir(it)}>
                <Cover src={it.cover} title={it.title} type={it.type} />
                <NotaBadge n={typeof periodo === "number" ? notaEnAño(it, periodo) : it.rating} />
                {(it.status === "en_curso" || it.status === "en_emision") && <span className="etiqueta">{ESTADOS[it.status]}</span>}
                <span className="tarjeta-titulo">{it.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
