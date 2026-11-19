import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { StoreProvider, useStore } from "./lib/store";
import { supabase } from "./lib/supabase";
import { Icon } from "./components/Icon";
import type { Item } from "./lib/types";
import { AddItem } from "./views/AddItem";
import { Archive } from "./views/Archive";
import { ItemSheet } from "./views/ItemSheet";
import { Login } from "./views/Login";
import { Stats } from "./views/Stats";
import { Swipe } from "./views/Swipe";

type Vista = "archivo" | "deslizar" | "resumen";

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <p className="vacio cargando">Cargando</p>;
  if (!session) return <Login />;
  return (
    <StoreProvider key={session.user.id}>
      <Principal />
    </StoreProvider>
  );
}

function Principal() {
  const { cargando, error } = useStore();
  const [vista, setVista] = useState<Vista>(() => (location.hash.slice(1) as Vista) || "archivo");
  const [abierto, setAbierto] = useState<Item | null>(null);
  const [añadiendo, setAñadiendo] = useState(false);

  useEffect(() => { history.replaceState(null, "", `#${vista}`); window.scrollTo(0, 0); }, [vista]);

  if (cargando) return <p className="vacio cargando">Preparando tu archivo</p>;

  return (
    <>
      {error && <p className="aviso error flotante">Error: {error}</p>}
      <main className="contenido">
        {vista === "archivo" && <Archive onAbrir={setAbierto} />}
        {vista === "deslizar" && <Swipe />}
        {vista === "resumen" && <Stats onAbrir={setAbierto} />}
      </main>

      <nav className="nav">
        <button className={vista === "archivo" ? "on" : ""} onClick={() => setVista("archivo")}><Icon name="archivo" />Archivo</button>
        <button className={vista === "deslizar" ? "on" : ""} onClick={() => setVista("deslizar")}><Icon name="deslizar" />Deslizar</button>
        <button className="nav-mas" onClick={() => setAñadiendo(true)} aria-label="Añadir"><span><Icon name="mas" size={22} /></span></button>
        <button className={vista === "resumen" ? "on" : ""} onClick={() => setVista("resumen")}><Icon name="resumen" />Resumen</button>
        <button onClick={() => { if (confirm("¿Cerrar sesión?")) supabase.auth.signOut(); }}><Icon name="salir" />Salir</button>
      </nav>

      <ItemSheet item={abierto} onClose={() => setAbierto(null)} />
      <AddItem open={añadiendo} onClose={() => setAñadiendo(false)} />
    </>
  );
}
