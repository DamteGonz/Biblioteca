import { useEffect, useMemo, useState } from "react";
import { Cover } from "../components/Cover";
import { RatingPicker } from "../components/RatingPicker";
import { Sheet } from "../components/Sheet";
import { useStore } from "../lib/store";
import { AÑOS, AÑO_ACTUAL, TIPOS, verbo, type Carta, type Estado, type Tipo } from "../lib/types";

interface Resultado extends Carta { autor?: string }

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

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function AddItem({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { guardar, mazo, items } = useStore();
  const [tipo, setTipo] = useState<Tipo>("movie");
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Resultado[]>([]);
  const [elegido, setElegido] = useState<Resultado | null>(null);
  const [nota, setNota] = useState<number | null>(null);
  const [estado, setEstado] = useState<Estado>("visto");
  const [año, setAño] = useState<number | "pre">(AÑO_ACTUAL);
  const [guardando, setGuardando] = useState(false);

  const yaTengo = useMemo(() => new Set(items.map((i) => i.key)), [items]);

  useEffect(() => {
    if (!open) { setQ(""); setRes([]); setElegido(null); setNota(null); setEstado("visto"); setAño(AÑO_ACTUAL); }
  }, [open]);

  useEffect(() => {
    const texto = q.trim();
    if (texto.length < 2) { setRes([]); return; }
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        const r = tipo === "book"
          ? await buscarLibros(texto)
          : (await mazo(tipo)).filter((c) => norm(c.t).includes(norm(texto))).slice(0, 12);
        if (vivo) setRes(r);
      } catch { if (vivo) setRes([]); }
    }, 300);
    return () => { vivo = false; clearTimeout(t); };
  }, [q, tipo, mazo]);

  async function guardarYa() {
    const carta = elegido ?? { k: `local:${tipo}-${Date.now()}`, t: q.trim(), y: null, c: null };
    if (!carta.t) return;
    setGuardando(true);
    await guardar({
      key: carta.k,
      type: tipo,
      title: carta.t,
      cover: carta.c,
      release_year: carta.y,
      status: estado,
      rating: estado === "pendiente" ? null : nota,
      years: estado !== "pendiente" && año !== "pre" ? [año] : [],
      pre2021: estado !== "pendiente" && año === "pre",
      notes: elegido?.autor ? `Autor: ${elegido.autor}` : null,
    });
    setGuardando(false);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Añadir">
      <div className="chips envolver">
        {TIPOS.map((t) => (
          <button key={t.id} className={`chip ${tipo === t.id ? "on" : ""}`} onClick={() => { setTipo(t.id); setElegido(null); }}>
            {t.nombre}
          </button>
        ))}
      </div>

      {!elegido ? (
        <>
          <input className="buscar ancho" autoFocus type="search" placeholder={tipo === "book" ? "Título o autor…" : "Título…"}
            value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar título" />
          <ul className="resultados">
            {res.map((r) => (
              <li key={r.k}>
                <button className="resultado" onClick={() => setElegido(r)} disabled={yaTengo.has(r.k)}>
                  <Cover src={r.c} title={r.t} type={tipo} className="mini" />
                  <span>
                    <strong>{r.t}</strong>
                    <small>{[r.y, r.autor].filter(Boolean).join(" · ")}{yaTengo.has(r.k) && " · ya está en tu archivo"}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {q.trim().length >= 2 && (
            <button className="btn" onClick={() => setElegido({ k: `local:${tipo}-${Date.now()}`, t: q.trim(), y: null, c: null })}>
              Añadir «{q.trim()}» a mano
            </button>
          )}
          {tipo !== "book" && <p className="ayuda">Busca entre los títulos más conocidos de antes de 2021. Si no sale, añádelo a mano y pon la portada desde su ficha.</p>}
        </>
      ) : (
        <div className="ficha">
          <div className="ficha-top">
            <Cover src={elegido.c} title={elegido.t} type={tipo} className="ficha-cover" />
            <div className="ficha-datos">
              <strong>{elegido.t}</strong>
              <p className="ficha-original">{[elegido.y, elegido.autor].filter(Boolean).join(" · ")}</p>
              <button className="enlace pequeño" onClick={() => setElegido(null)}>Cambiar</button>
            </div>
          </div>

          <div className="segmentado ancho">
            <button className={estado === "visto" ? "on" : ""} onClick={() => setEstado("visto")}>Lo he {verbo(tipo)}</button>
            <button className={estado === "pendiente" ? "on" : ""} onClick={() => setEstado("pendiente")}>Pendiente</button>
            {tipo === "series" && <button className={estado === "en_emision" ? "on" : ""} onClick={() => setEstado("en_emision")}>Sin acabar</button>}
          </div>

          {estado !== "pendiente" && (
            <>
              <h3>¿Cuándo?</h3>
              <div className="chips envolver">
                {AÑOS.map((a) => <button key={a} className={`chip suave ${año === a ? "on" : ""}`} onClick={() => setAño(a)}>{a}</button>)}
                <button className={`chip suave ${año === "pre" ? "on" : ""}`} onClick={() => setAño("pre")}>Antes de 2021</button>
              </div>
              <h3>Nota</h3>
              <RatingPicker value={nota} onChange={setNota} />
            </>
          )}
          <button className="btn primario" disabled={guardando} onClick={guardarYa}>Guardar</button>
        </div>
      )}
    </Sheet>
  );
}
