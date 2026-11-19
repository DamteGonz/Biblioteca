import { useMemo, useState } from "react";
import { Cover } from "../components/Cover";
import { NotaBadge } from "../components/RatingPicker";
import { useStore } from "../lib/store";
import { AÑOS, TIPOS, fmtNota, notaEnAño, type Item } from "../lib/types";

type Periodo = number | "pre";

export function Stats({ onAbrir }: { onAbrir: (it: Item) => void }) {
  const { items } = useStore();
  const [periodo, setPeriodo] = useState<Periodo>(AÑOS[0]);

  const delPeriodo = useMemo(
    () => items.filter((it) =>
      ["visto", "en_curso", "en_emision"].includes(it.status) &&
      (periodo === "pre" ? it.pre2021 : it.years.includes(periodo))),
    [items, periodo],
  );

  const porTipo = TIPOS.map((t) => {
    const lista = delPeriodo
      .filter((it) => it.type === t.id)
      .map((it) => ({ it, nota: notaEnAño(it, periodo) }))
      .sort((a, b) => (b.nota ?? -1) - (a.nota ?? -1) || a.it.title.localeCompare(b.it.title));
    const notas = lista.map((x) => x.nota).filter((n): n is number => n != null);
    const media = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
    return { ...t, lista, media, dieces: notas.filter((n) => n === 10).length };
  });

  const total = delPeriodo.length;

  return (
    <section className="stats">
      <header className="barra">
        <h1>Resumen {periodo === "pre" ? "antes de 2021" : periodo}</h1>
        <p className="sub">Para el vídeo de fin de año.</p>
      </header>

      <div className="chips">
        {AÑOS.map((a) => (
          <button key={a} className={`chip suave ${periodo === a ? "on" : ""}`} onClick={() => setPeriodo(a)}>{a}</button>
        ))}
        <button className={`chip suave ${periodo === "pre" ? "on" : ""}`} onClick={() => setPeriodo("pre")}>Antes de 2021</button>
      </div>

      <div className="kpis">
        <div className="kpi"><span className="kpi-n">{total}</span><span>en total</span></div>
        {porTipo.filter((t) => t.lista.length).map((t) => (
          <div className="kpi" key={t.id}>
            <span className="kpi-n">{t.lista.length}</span>
            <span>{t.icono} {t.plural.toLowerCase()}</span>
            {t.media != null && <span className="kpi-media">media {fmtNota(Math.round(t.media * 100) / 100)}</span>}
          </div>
        ))}
      </div>

      {porTipo.filter((t) => t.lista.length).map((t) => (
        <article key={t.id} className="ranking">
          <h2>{t.icono} Top {t.plural.toLowerCase()} {t.dieces > 0 && <small>· {t.dieces} diez{t.dieces > 1 ? "es" : ""}</small>}</h2>
          <ol>
            {t.lista.slice(0, 10).map(({ it, nota }, i) => (
              <li key={it.id}>
                <button className="ranking-fila" onClick={() => onAbrir(it)}>
                  <span className="pos">{i + 1}</span>
                  <Cover src={it.cover} title={it.title} type={it.type} className="mini" />
                  <span className="ranking-titulo">
                    {it.title}
                    {(it.status === "en_curso" || it.status === "en_emision") && <small> · sin acabar</small>}
                  </span>
                  <NotaBadge n={nota} />
                </button>
              </li>
            ))}
          </ol>
          {t.lista.length > 10 && (
            <details>
              <summary>Ver los {t.lista.length - 10} restantes</summary>
              <ol start={11}>
                {t.lista.slice(10).map(({ it, nota }) => (
                  <li key={it.id} className="resto"><button className="enlace" onClick={() => onAbrir(it)}>{it.title}</button> {fmtNota(nota)}</li>
                ))}
              </ol>
            </details>
          )}
        </article>
      ))}

      {total === 0 && <p className="vacio">Nada registrado en este periodo.</p>}
    </section>
  );
}
