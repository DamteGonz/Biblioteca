import type { CSSProperties } from "react";
import { escalaNota, fmtNota } from "../lib/types";
import { Icon } from "./Icon";

const NOTAS = Array.from({ length: 21 }, (_, i) => i / 2);

const vars = (n: number) => {
  const e = escalaNota(n);
  return { "--nota-bg": e.bg, "--nota-fg": e.fg } as CSSProperties;
};

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
          className={`nota-btn ${value === n ? "activa" : ""} ${Number.isInteger(n) ? "" : "media"} ${n === 10 ? "diez" : ""}`}
          style={vars(n)}
          onClick={() => onChange(value === n ? null : n)}
        >
          {n === 10 && <Icon name="nota" size={13} fill />}
          {fmtNota(n)}
        </button>
      ))}
    </div>
  );
}

export function NotaBadge({ n, grande = false }: { n: number | null; grande?: boolean }) {
  if (n == null) return null;
  return (
    <span className={`badge ${grande ? "grande" : ""} ${n === 10 ? "diez" : ""}`} style={vars(n)} aria-label={`Nota ${fmtNota(n)}`}>
      {n === 10 && <Icon name="nota" size={grande ? 22 : 11} fill />}
      {fmtNota(n)}
    </span>
  );
}
