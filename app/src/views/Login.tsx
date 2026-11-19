import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

export function Login() {
  const [modo, setModo] = useState<"entrar" | "crear">("entrar");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<{ tipo: "error" | "ok"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setMsg(null);
    const { error } =
      modo === "entrar"
        ? await supabase.auth.signInWithPassword({ email, password: pass })
        : await supabase.auth.signUp({ email, password: pass, options: { emailRedirectTo: location.href } });
    setEnviando(false);
    if (error) {
      const t = error.message.includes("Invalid login") ? "Email o contraseña incorrectos."
        : error.message.includes("not confirmed") ? "Tienes que confirmar el email: revisa tu correo."
        : error.message;
      setMsg({ tipo: "error", texto: t });
    } else if (modo === "crear") {
      setMsg({ tipo: "ok", texto: "¡Cuenta creada! Te he mandado un email: pulsa el enlace para confirmarla y luego entra." });
      setModo("entrar");
    }
  }

  return (
    <main className="login">
      <p className="eyebrow">Archivo personal · desde 2021</p>
      <h1 className="marca">Biblio<em>teca</em></h1>
      <p className="sub">Todo lo que he visto, jugado y leído. Con nota.</p>
      <form onSubmit={enviar} className="login-form">
        <label>
          Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Contraseña
          <input type="password" autoComplete={modo === "entrar" ? "current-password" : "new-password"} minLength={6} required
            value={pass} onChange={(e) => setPass(e.target.value)} />
        </label>
        {msg && <p className={`aviso ${msg.tipo}`}>{msg.texto}</p>}
        <button className="btn primario" disabled={enviando}>
          {enviando ? "…" : modo === "entrar" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>
      <button className="enlace" onClick={() => { setModo(modo === "entrar" ? "crear" : "entrar"); setMsg(null); }}>
        {modo === "entrar" ? "¿Primera vez? Crea tu cuenta" : "Ya tengo cuenta"}
      </button>
    </main>
  );
}
