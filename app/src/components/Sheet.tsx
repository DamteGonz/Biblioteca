import { useEffect, type ReactNode } from "react";

/** Panel que sube desde abajo (en escritorio, ventana centrada). */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-fondo" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-cabecera">
          <span className="sheet-asa" />
          {title && <h2>{title}</h2>}
          <button className="icono-btn cerrar" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="sheet-cuerpo">{children}</div>
      </div>
    </div>
  );
}
