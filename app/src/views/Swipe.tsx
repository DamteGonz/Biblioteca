import { animate, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Cover } from "../components/Cover";
import { Icon } from "../components/Icon";
import { RatingPicker } from "../components/RatingPicker";
import { Sheet } from "../components/Sheet";
import { useStore } from "../lib/store";
import { tipoInfo, verbo, type Carta, type Estado, type Tipo } from "../lib/types";

type TipoMazo = Exclude<Tipo, "book">;
type Accion = "izq" | "der" | "arriba" | "abajo";

const CUOTA: Record<TipoMazo, number> = { movie: 15, series: 10, game: 10 };
const UMBRAL = 100;

const hoy = () => new Date().toISOString().slice(0, 10);

function leerCuota(): Record<TipoMazo, number> {
  try {
    const d = JSON.parse(localStorage.getItem("cuota") ?? "{}");
    if (d.dia === hoy()) return d.n;
  } catch { /* sin almacenamiento */ }
  return { movie: 0, series: 0, game: 0 };
}

function guardarCuota(n: Record<TipoMazo, number>) {
  try { localStorage.setItem("cuota", JSON.stringify({ dia: hoy(), n })); } catch { /* sin almacenamiento */ }
}

export function Swipe() {
  const { items, guardar, borrar, mazo } = useStore();
  const [tipo, setTipo] = useState<TipoMazo>("movie");
  const [pool, setPool] = useState<Carta[] | null>(null);
  const [cuota, setCuota] = useState(leerCuota);
  const [extra, setExtra] = useState(false);
  const [puntuando, setPuntuando] = useState<Carta | null>(null);
  const [deshacer, setDeshacer] = useState<{ carta: Carta; id: string; tipo: TipoMazo } | null>(null);
  const [saltadas, setSaltadas] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPool(null);
    setExtra(false);
    mazo(tipo).then(setPool);
  }, [tipo, mazo]);

  const usadas = useMemo(() => new Set(items.map((i) => i.key)), [items]);
  const cola = useMemo(
    () => (pool ?? []).filter((c) => !usadas.has(c.k) && !saltadas.has(c.k)).slice(0, 3),
    [pool, usadas, saltadas],
  );
  const restantes = useMemo(() => (pool ?? []).filter((c) => !usadas.has(c.k)).length, [pool, usadas]);
  const hecho = cuota[tipo] >= CUOTA[tipo] && !extra;

  async function decidir(carta: Carta, accion: Accion, nota?: number | null) {
    if (accion === "der" && nota === undefined) {
      setPuntuando(carta);
      return;
    }
    const estado: Estado = accion === "izq" ? "no_visto" : accion === "abajo" ? "pendiente" : "visto";
    setSaltadas((s) => new Set(s).add(carta.k));
    const nuevo = await guardar({
      key: carta.k,
      type: tipo,
      title: carta.t,
      cover: carta.c,
      release_year: carta.y,
      status: estado,
      rating: accion === "der" ? nota ?? null : null,
      pre2021: accion === "der" || accion === "arriba",
    });
    if (nuevo) setDeshacer({ carta, id: nuevo.id, tipo });
    const n = { ...cuota, [tipo]: cuota[tipo] + 1 };
    setCuota(n);
    guardarCuota(n);
  }

  async function onDeshacer() {
    if (!deshacer) return;
    await borrar(deshacer.id);
    setSaltadas((s) => { const c = new Set(s); c.delete(deshacer.carta.k); return c; });
    const n = { ...cuota, [deshacer.tipo]: Math.max(0, cuota[deshacer.tipo] - 1) };
    setCuota(n);
    guardarCuota(n);
    setDeshacer(null);
  }

  return (
    <section className="deslizar">
      <header className="cabecera compacta">
        <p className="eyebrow">Antes de 2021</p>
        <h1>¿Lo has <em>{verbo(tipo)}</em>?</h1>
      </header>

      <div className="segmentado ancho">
        {(Object.keys(CUOTA) as TipoMazo[]).map((t) => (
          <button key={t} className={tipo === t ? "on" : ""} onClick={() => setTipo(t)}>
            {tipoInfo(t).plural}<span className="contador">{Math.min(cuota[t], CUOTA[t])}/{CUOTA[t]}</span>
          </button>
        ))}
      </div>

      <div className="pie-mazo">
        <button className="enlace con-icono" disabled={!deshacer} onClick={onDeshacer}><Icon name="deshacer" size={16} />Deshacer</button>
        <span>{restantes} por descubrir</span>
      </div>
      <div className="mazo">
        {!pool ? (
          <p className="vacio">Cargando…</p>
        ) : hecho ? (
          <div className="fin-dia">
            <p className="grande">Hecho por hoy.</p>
            <p>Mañana tendrás {CUOTA[tipo]} {tipoInfo(tipo).plural.toLowerCase()} más.</p>
            <button className="btn" onClick={() => setExtra(true)}>Seguir un poco más</button>
          </div>
        ) : cola.length === 0 ? (
          <p className="vacio">No quedan más cartas en este mazo.</p>
        ) : (
          [...cola].reverse().map((c, i, arr) => (
            <CartaDeslizable key={c.k} carta={c} tipo={tipo} arriba={i === arr.length - 1} profundidad={arr.length - 1 - i}
              onDecidir={(a) => decidir(c, a)} />
          ))
        )}
      </div>

      {pool && !hecho && cola[0] && (
        <div className="acciones">
          <button className="accion izq" onClick={() => decidir(cola[0], "izq")} aria-label="No lo he visto"><Icon name="no" size={22} /><small>No</small></button>
          <button className="accion abajo" onClick={() => decidir(cola[0], "abajo")} aria-label="Lo quiero ver"><Icon name="pendiente" size={22} /><small>Pendiente</small></button>
          <button className="accion arriba" onClick={() => decidir(cola[0], "arriba")} aria-label="Visto, no lo recuerdo"><Icon name="duda" size={22} /><small>No recuerdo</small></button>
          <button className="accion der" onClick={() => decidir(cola[0], "der")} aria-label="Lo he visto: poner nota"><Icon name="nota" size={22} /><small>Nota</small></button>
        </div>
      )}


      <Sheet open={!!puntuando} onClose={() => setPuntuando(null)} title={puntuando ? `¿Qué nota le das a «${puntuando.t}»?` : ""}>
        {puntuando && (
          <RatingPicker value={null} onChange={(n) => { const c = puntuando; setPuntuando(null); decidir(c, "der", n); }} />
        )}
      </Sheet>
    </section>
  );
}

function CartaDeslizable({ carta, tipo, arriba, profundidad, onDecidir }: {
  carta: Carta; tipo: TipoMazo; arriba: boolean; profundidad: number; onDecidir: (a: Accion) => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rot = useTransform(x, [-200, 200], [-14, 14]);
  const oIzq = useTransform(x, [-UMBRAL, -20], [1, 0]);
  const oDer = useTransform(x, [20, UMBRAL], [0, 1]);
  const oArr = useTransform(y, [-UMBRAL, -20], [1, 0]);
  const oAba = useTransform(y, [20, UMBRAL], [0, 1]);
  const ref = useRef<HTMLDivElement>(null);

  function soltar(_: unknown, info: PanInfo) {
    const { offset: o, velocity: v } = info;
    const dx = o.x + v.x * 0.15;
    const dy = o.y + v.y * 0.15;
    let a: Accion | null = null;
    if (Math.abs(dx) > Math.abs(dy)) a = dx > UMBRAL ? "der" : dx < -UMBRAL ? "izq" : null;
    else a = dy < -UMBRAL ? "arriba" : dy > UMBRAL ? "abajo" : null;
    if (!a) {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
      animate(y, 0, { type: "spring", stiffness: 400, damping: 30 });
      return;
    }
    if (a === "der") {
      // Vuelve al centro mientras eliges la nota.
      animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
      animate(y, 0, { type: "spring", stiffness: 300, damping: 30 });
      onDecidir(a);
      return;
    }
    const destino = { izq: [-600, 0], arriba: [0, -800], abajo: [0, 800] }[a];
    animate(x, destino[0], { duration: 0.25 });
    animate(y, destino[1], { duration: 0.25 }).then(() => onDecidir(a!));
  }

  return (
    <motion.div
      ref={ref}
      className="carta"
      style={{ x, y, rotate: rot, zIndex: 10 - profundidad, scale: 1 - profundidad * 0.04, translateY: profundidad * 10 }}
      drag={arriba}
      dragMomentum={false}
      onDragEnd={soltar}
      whileDrag={{ cursor: "grabbing" }}
    >
      <Cover src={carta.c} title={carta.t} type={tipo} className="carta-cover" />
      <div className="carta-info">
        <strong>{carta.t}</strong>
        {carta.y && <span>{carta.y}</span>}
      </div>
      {arriba && (
        <>
          <motion.span className="sello izq" style={{ opacity: oIzq }}>NO</motion.span>
          <motion.span className="sello der" style={{ opacity: oDer }}>NOTA</motion.span>
          <motion.span className="sello arriba" style={{ opacity: oArr }}>NO RECUERDO</motion.span>
          <motion.span className="sello abajo" style={{ opacity: oAba }}>PENDIENTE</motion.span>
        </>
      )}
    </motion.div>
  );
}
