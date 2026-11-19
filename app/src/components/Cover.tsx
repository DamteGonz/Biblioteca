import { useState } from "react";
import { tipoInfo, type Tipo } from "../lib/types";

export function Cover({ src, title, type, className = "" }: { src: string | null; title: string; type: Tipo; className?: string }) {
  const [fallo, setFallo] = useState(false);
  if (!src || fallo) {
    return (
      <div className={`cover cover-vacia ${className}`} aria-label={title}>
        <span className="cover-icono">{tipoInfo(type).icono}</span>
        <span className="cover-titulo">{title}</span>
      </div>
    );
  }
  return <img className={`cover ${className}`} src={src} alt={title} loading="lazy" draggable={false} onError={() => setFallo(true)} />;
}
