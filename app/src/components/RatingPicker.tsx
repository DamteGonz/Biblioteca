import { fmtNota } from "../lib/types";

const NOTAS = Array.from({ length: 21 }, (_, i) => i / 2);

/** Selector de nota del 0 al 10 con medios puntos. */
export function RatingPicker({ value, onChange }: { value: number | null; onChange: (n: number | null) => void }) {
  return (
    <div className="notas" role="radiogroup" aria-label="Nota">
      {NOTAS.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          className={`nota-btn ${value === n ? "activa" : ""} ${Number.isInteger(n) ? "" : "media"}`}
          style={{ ["--h" as string]: String(Math.round(n * 12)) }}
          onClick={() => onChange(value === n ? null : n)}
        >
          {fmtNota(n)}
        </button>
      ))}
    </div>
  );
}

export function NotaBadge({ n, grande = false }: { n: number | null; grande?: boolean }) {
  if (n == null) return null;
  return (
    <span className={`badge ${grande ? "grande" : ""}`} style={{ ["--h" as string]: String(Math.round(n * 12)) }}>
      {fmtNota(n)}
    </span>
  );
}
