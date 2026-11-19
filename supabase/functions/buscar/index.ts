// Función "buscar": busca películas y series (TMDB) o juegos (IGDB) por título.
// Las claves viven como secretos de Supabase: TMDB_TOKEN, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET.
// Solo responde a usuarios con sesión iniciada (verify_jwt).

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Resultado { k: string; t: string; y: number | null; c: string | null; o?: string | null }

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

async function tmdb(tipo: "movie" | "tv", q: string): Promise<Resultado[]> {
  const token = Deno.env.get("TMDB_TOKEN");
  if (!token) throw new Error("Falta el secreto TMDB_TOKEN");
  const url = `https://api.themoviedb.org/3/search/${tipo}?query=${encodeURIComponent(q)}&language=es-ES&include_adult=false`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  const d = await r.json();
  return d.results.slice(0, 15).map((x: Record<string, any>) => {
    const fecha = x.release_date || x.first_air_date;
    const t = x.title || x.name;
    const o = x.original_title || x.original_name;
    return {
      k: `tmdb:${tipo}:${x.id}`,
      t,
      o: o && o !== t ? o : null,
      y: fecha ? Number(fecha.slice(0, 4)) : null,
      c: x.poster_path ? `https://image.tmdb.org/t/p/w342${x.poster_path}` : null,
    };
  });
}

let twitch: { token: string; caduca: number } | null = null;

async function tokenTwitch(): Promise<string> {
  if (twitch && twitch.caduca > Date.now()) return twitch.token;
  const id = Deno.env.get("TWITCH_CLIENT_ID");
  const secret = Deno.env.get("TWITCH_CLIENT_SECRET");
  if (!id || !secret) throw new Error("Faltan los secretos de Twitch");
  const r = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({ client_id: id, client_secret: secret.trim(), grant_type: "client_credentials" }),
  });
  if (!r.ok) throw new Error(`Twitch ${r.status}`);
  const d = await r.json();
  twitch = { token: d.access_token, caduca: Date.now() + (d.expires_in - 3600) * 1000 };
  return twitch.token;
}

async function igdb(q: string): Promise<Resultado[]> {
  const token = await tokenTwitch();
  const texto = q.replace(/"/g, "");
  const r = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: { "Client-ID": Deno.env.get("TWITCH_CLIENT_ID")!, Authorization: `Bearer ${token}` },
    body: `search "${texto}"; fields name,cover.image_id,first_release_date; where version_parent = null; limit 15;`,
  });
  if (!r.ok) throw new Error(`IGDB ${r.status}`);
  const d = await r.json();
  return d.map((x: Record<string, any>) => ({
    k: `igdb:${x.id}`,
    t: x.name,
    y: x.first_release_date ? new Date(x.first_release_date * 1000).getUTCFullYear() : null,
    c: x.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${x.cover.image_id}.jpg` : null,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { tipo, q } = await req.json();
    const texto = String(q ?? "").trim().slice(0, 120);
    if (texto.length < 2) return json([]);
    if (tipo === "movie") return json(await tmdb("movie", texto));
    if (tipo === "series") return json(await tmdb("tv", texto));
    if (tipo === "game") return json(await igdb(texto));
    return json({ error: "tipo no válido" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
