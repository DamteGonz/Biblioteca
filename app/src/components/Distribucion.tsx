import { useState } from "react";
import { escalaNota, fmtNota } from "../lib/types";

/**
 * Cuántos títulos hay con cada nota. Una barra por nota (de la más baja que tengas
 * hasta el 10, con huecos a cero para que la escala sea honesta), color de su nota,
 * cifra encima y detalle al tocar o pasar el ratón.
 */
export function Distribucion({ notas, plural }: { notas: number[]; plural: string }) {
  const [activa, setActiva] = useState<number | null>(null);
  if (notas.length === 0) return null;

  const cuenta = new Map<number, number>();
  for (const n of notas) cuenta.set(n, (cuenta.get(n) ?? 0) + 1);
  const minimo = Math.min(...notas);
  const valores: number[] = [];
  for (let v = Math.floor(minimo * 2) / 2; v <= 10; v += 0.5) valores.push(v);
  const max = Math.max(...cuenta.values());

  const detalle = activa != null
    ? `${cuenta.get(activa) ?? 0} ${plural.toLowerCase()} con un ${fmtNota(activa)}`
    : `${notas.length} ${plural.toLowerCase()} con nota`;

  return (
    <figure className="distribucion">
      <figcaption>
        <span>Títulos por nota</span>
        <span className="distribucion-detalle" aria-live="polite">{detalle}</span>
      </figcaption>
      <div className="barras" role="list" onMouseLeave={() => setActiva(null)}>
        {valores.map((v) => {
          const n = cuenta.get(v) ?? 0;
          const e = escalaNota(v);
          return (
            <button key={v} role="listitem" className={`barra ${activa === v ? "on" : ""} ${activa != null && activa !== v ? "atenuada" : ""}`}
              aria-label={`${fmtNota(v)}: ${n}`}
              onMouseEnter={() => setActiva(v)} onFocus={() => setActiva(v)} onClick={() => setActiva(activa === v ? null : v)}>
              <span className="barra-n">{n > 0 ? n : ""}</span>
              <span className="barra-pista">
                <span className="barra-relleno" style={{ height: `${(n / max) * 100}%`, background: e.bg }} />
              </span>
              <span className={`barra-eje ${Number.isInteger(v) ? "" : "media"}`}>{Number.isInteger(v) ? fmtNota(v) : "·"}</span>
            </button>
          );
        })}
      </div>
      <table className="sr-only">
        <caption>Títulos por nota</caption>
        <tbody>{valores.filter((v) => cuenta.get(v)).map((v) => <tr key={v}><th>{fmtNota(v)}</th><td>{cuenta.get(v)}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
