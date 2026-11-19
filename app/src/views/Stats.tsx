import { useMemo, useState } from "react";
import { Cover } from "../components/Cover";
import { NotaBadge } from "../components/RatingPicker";
import { useStore } from "../lib/store";
import { AÑOS, TIPOS, fmtNota, notaEnAño, type Item } from "../lib/types";

type Periodo = "vida" | "pre" | number;

const VISTOS = ["visto", "en_curso", "en_emision"];

export function Stats({ onAbrir }: { onAbrir: (it: Item) => void }) {
  const { items } = useStore();
  const [periodo, setPeriodo] = useState<Periodo>(AÑOS[0]);

  const delPeriodo = useMemo(
    () => items.filter((it) =>
      VISTOS.includes(it.status) &&
      (periodo === "vida" ? true : periodo === "pre" ? it.pre2021 : it.years.includes(periodo))),
    [items, periodo],
  );

  const nota = (it: Item) => (typeof periodo === "number" ? notaEnAño(it, periodo) : it.rating);

  const porTipo = TIPOS.map((t) => {
    const lista = delPeriodo
      .filter((it) => it.type === t.id)
      .map((it) => ({ it, nota: nota(it) }))
      .sort((a, b) => (b.nota ?? -1) - (a.nota ?? -1) || a.it.title.localeCompare(b.it.title));
    const notas = lista.map((x) => x.nota).filter((n): n is number => n != null);
    const media = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
    return { ...t, lista, media, dieces: notas.filter((n) => n === 10).length };
  }).filter((t) => t.lista.length);

  const titulo = periodo === "vida" ? "Toda mi vida" : periodo === "pre" ? "Antes de 2021" : String(periodo);

  return (
    <section className="stats">
      <header className="cabecera">
        <p className="eyebrow">Resumen</p>
        <h1>{typeof periodo === "number" ? <>{periodo}</> : <em>{titulo}</em>}</h1>
      </header>

      <div className="chips">
        {AÑOS.map((a) => (
          <button key={a} className={`chip ${periodo === a ? "on" : ""}`} onClick={() => setPeriodo(a)}>{a}</button>
        ))}
        <button className={`chip ${periodo === "pre" ? "on" : ""}`} onClick={() => setPeriodo("pre")}>Antes de 2021</button>
        <button className={`chip ${periodo === "vida" ? "on" : ""}`} onClick={() => setPeriodo("vida")}>Toda mi vida</button>
      </div>

      <dl className="kpis">
        <div className="kpi total">
          <dt>Total</dt>
          <dd>{delPeriodo.length}</dd>
        </div>
        {porTipo.map((t) => (
          <div className="kpi" key={t.id}>
            <dt>{t.plural}</dt>
            <dd>{t.lista.length}</dd>
            {t.media != null && <span className="kpi-media">Media {fmtNota(Math.round(t.media * 100) / 100)}</span>}
          </div>
        ))}
      </dl>

      {porTipo.map((t) => (
        <article key={t.id} className="ranking">
          <header>
            <h2>Top {t.plural.toLowerCase()}</h2>
            {t.dieces > 0 && <span className="ranking-meta">{t.dieces} {t.dieces > 1 ? "dieces" : "diez"}</span>}
          </header>
          <ol>
            {t.lista.slice(0, 10).map(({ it, nota }, i) => (
              <li key={it.id}>
                <button className="ranking-fila" onClick={() => onAbrir(it)}>
                  <span className="pos">{String(i + 1).padStart(2, "0")}</span>
                  <Cover src={it.cover} title={it.title} type={it.type} className="mini" />
                  <span className="ranking-titulo">
                    {it.title}
                    {(it.status === "en_curso" || it.status === "en_emision") && <small>Sin acabar</small>}
                  </span>
                  <NotaBadge n={nota} />
                </button>
              </li>
            ))}
          </ol>
          {t.lista.length > 10 && (
            <details>
              <summary>Ver los {t.lista.length - 10} restantes</summary>
              <ol start={11} className="resto">
                {t.lista.slice(10).map(({ it, nota }) => (
                  <li key={it.id}>
                    <button className="enlace" onClick={() => onAbrir(it)}>{it.title}</button>
                    <span>{fmtNota(nota)}</span>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </article>
      ))}

      {delPeriodo.length === 0 && <p className="vacio">Nada registrado en este periodo.</p>}
    </section>
  );
}
