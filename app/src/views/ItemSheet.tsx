import { useEffect, useState } from "react";
import { Cover } from "../components/Cover";
import { NotaBadge, RatingPicker } from "../components/RatingPicker";
import { Sheet } from "../components/Sheet";
import { useStore } from "../lib/store";
import { AÑOS, AÑO_ACTUAL, ESTADOS, fmtNota, tipoInfo, verbo, type Estado, type Item } from "../lib/types";

const ESTADOS_EDITABLES: Estado[] = ["visto", "en_curso", "en_emision", "pendiente", "no_visto"];

export function ItemSheet({ item, onClose }: { item: Item | null; onClose: () => void }) {
  const { actualizar, borrar, items } = useStore();
  const actual = item ? items.find((x) => x.id === item.id) ?? item : null;
  const [review, setReview] = useState<number | null>(null);
  const [añoReview, setAñoReview] = useState(AÑO_ACTUAL);
  const [editCover, setEditCover] = useState(false);
  const [coverUrl, setCoverUrl] = useState("");

  useEffect(() => {
    setReview(null);
    setEditCover(false);
    setCoverUrl(item?.cover ?? "");
  }, [item?.id, item?.cover]);

  if (!actual) return null;
  const it = actual;
  const cambiar = (c: Partial<Item>) => actualizar(it.id, c);

  function toggleAño(a: number) {
    const years = it.years.includes(a) ? it.years.filter((y) => y !== a) : [...it.years, a].sort();
    cambiar({ years });
  }

  function ponerNota(n: number | null) {
    const c: Partial<Item> = { rating: n };
    if (n != null && (it.status === "pendiente" || it.status === "no_visto" || it.status === "no_recuerdo")) {
      c.status = "visto";
      if (!it.years.length && !it.pre2021) c.years = [AÑO_ACTUAL];
    }
    cambiar(c);
  }

  function añadirReview() {
    if (review == null) return;
    const history = [...it.history, { year: añoReview, rating: review, note: "review" }];
    const years = it.years.includes(añoReview) ? it.years : [...it.years, añoReview].sort();
    cambiar({ history, years, rating: review });
    setReview(null);
  }

  return (
    <Sheet open onClose={onClose} title={it.title}>
      <div className="ficha">
        <div className="ficha-top">
          <Cover src={it.cover} title={it.title} type={it.type} className="ficha-cover" />
          <div className="ficha-datos">
            <p className="ficha-tipo">
              {tipoInfo(it.type).icono} {tipoInfo(it.type).nombre}
              {it.anime && " · anime"}
              {it.hackrom && " · hackrom"}
              {it.release_year && ` · ${it.release_year}`}
            </p>
            {it.original_title && <p className="ficha-original">{it.original_title}</p>}
            {it.dlc_of && <p className="ficha-original">DLC de {it.dlc_of}</p>}
            <div className="ficha-nota">
              <NotaBadge n={it.rating} grande />
              {it.rating == null && <span className="sin-nota">Sin nota</span>}
            </div>
            <button className="enlace pequeño" onClick={() => setEditCover(!editCover)}>Cambiar portada</button>
          </div>
        </div>

        {editCover && (
          <div className="campo">
            <label>URL de la portada
              <input type="url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" />
            </label>
            <button className="btn" onClick={() => { cambiar({ cover: coverUrl || null }); setEditCover(false); }}>Guardar portada</button>
          </div>
        )}

        <h3>Nota {it.type === "series" && "global"}</h3>
        <RatingPicker value={it.rating} onChange={ponerNota} />

        <h3>Estado</h3>
        <div className="chips envolver">
          {ESTADOS_EDITABLES.map((e) => (
            <button key={e} className={`chip ${it.status === e || (e === "visto" && it.status === "no_recuerdo") ? "on" : ""}`}
              onClick={() => cambiar({ status: e })}>
              {ESTADOS[e]}
            </button>
          ))}
        </div>

        <h3>¿Cuándo lo has {verbo(it.type)}?</h3>
        <div className="chips envolver">
          <button className={`chip suave ${it.pre2021 ? "on" : ""}`} onClick={() => cambiar({ pre2021: !it.pre2021 })}>Antes de 2021</button>
          {[...AÑOS].reverse().map((a) => (
            <button key={a} className={`chip suave ${it.years.includes(a) ? "on" : ""}`} onClick={() => toggleAño(a)}>{a}</button>
          ))}
        </div>

        {it.type === "series" && (
          <>
            <h3>Reviews por temporada</h3>
            {it.history.filter((h) => h.rating != null).length > 0 ? (
              <ul className="historial">
                {it.history.filter((h) => h.rating != null).map((h, i) => (
                  <li key={i}><span>{h.year}</span><span className="nota-txt">{fmtNota(h.rating)}</span></li>
                ))}
              </ul>
            ) : <p className="vacio pequeño">Sin reviews todavía.</p>}
            <div className="nueva-review">
              <p className="ayuda">¿Nueva temporada? Ponle nota: pasa a ser la nota global.</p>
              <select value={añoReview} onChange={(e) => setAñoReview(Number(e.target.value))} aria-label="Año de la review">
                {AÑOS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <RatingPicker value={review} onChange={setReview} />
              <button className="btn primario" disabled={review == null} onClick={añadirReview}>Guardar review</button>
            </div>
          </>
        )}

        <h3>Notas</h3>
        <textarea defaultValue={it.notes ?? ""} placeholder="Comentarios para el vídeo…" rows={3}
          onBlur={(e) => e.target.value !== (it.notes ?? "") && cambiar({ notes: e.target.value || null })} />

        <button className="btn peligro" onClick={() => { if (confirm(`¿Borrar «${it.title}» del archivo?`)) { borrar(it.id); onClose(); } }}>
          Borrar del archivo
        </button>
      </div>
    </Sheet>
  );
}
