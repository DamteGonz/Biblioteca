"""Genera los ficheros de datos que usa la app (app/public/data/).

- seed.json: el archivo importado del Excel, ya con portadas, listo para subir a Supabase
  la primera vez que inicias sesión.
- pool-movie.json, pool-series.json, pool-game.json: mazos para deslizar (compactos).
"""
import json

from common import DATA, ROOT, load, split_title

OUT = ROOT / "app" / "public" / "data"
TMDB_IMG = "https://image.tmdb.org/t/p/w342"
IGDB_IMG = "https://images.igdb.com/igdb/image/upload/t_cover_big/{}.jpg"


def cover_tmdb(path):
    return f"{TMDB_IMG}{path}" if path else None


def seed():
    items = load("biblioteca.json")["items"]
    tmdb = load("meta/tmdb.json", {})
    igdb = load("meta/igdb.json", {})
    out = []
    for it in items:
        row = {
            "key": f"local:{it['id']}",
            "type": it["type"],
            "title": it["title"],
            "original_title": None,
            "cover": None,
            "release_year": None,
            "status": it["status"],
            "rating": it["rating"],
            "years": it["years"] if it["status"] != "pendiente" else [],
            "history": [{"year": e["year"], "rating": e["rating"], "note": e["excel"]} for e in it["entries"]],
            "anime": bool(it.get("anime")),
            "dlc_of": it.get("dlcOf"),
            "hackrom": bool(it.get("hackrom")),
        }
        _, año_pedido = split_title(it["title"])
        if it["type"] in ("movie", "series") and tmdb.get(it["id"]):
            m = tmdb[it["id"]]
            row.update(key=f"tmdb:{m['kind']}:{m['tmdbId']}", title=m["title"],
                       original_title=m["original"] if m["original"] != m["title"] else None,
                       cover=cover_tmdb(m["poster"]), release_year=m["year"])
        elif it["type"] == "game" and igdb.get(it["id"]):
            m = igdb[it["id"]]
            if not (año_pedido and m["year"] != año_pedido):  # año pedido distinto: no es ese juego
                row.update(key=f"igdb:{m['igdbId']}", title=m["title"],
                           cover=IGDB_IMG.format(m["cover"]) if m["cover"] else None,
                           release_year=m["year"])
        out.append(row)
    keys = [r["key"] for r in out]
    assert len(keys) == len(set(keys)), "claves duplicadas"
    return out


def pools():
    res = {}
    for kind, fichero in (("movie", "movies"), ("series", "series")):
        tk = "movie" if kind == "movie" else "tv"
        res[kind] = [{"k": f"tmdb:{tk}:{x['tmdbId']}", "t": x["title"], "y": x["year"],
                      "c": cover_tmdb(x["poster"])} for x in load(f"pool/{fichero}.json", [])]
    res["game"] = [{"k": f"igdb:{x['igdbId']}", "t": x["title"], "y": x["year"],
                    "c": IGDB_IMG.format(x["cover"])} for x in load("pool/games.json", []) if x["cover"]]
    return res


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    s = seed()
    (OUT / "seed.json").write_text(json.dumps(s, ensure_ascii=False, separators=(",", ":")))
    print("seed", len(s), "sin portada:", [r["title"] for r in s if not r["cover"]])
    for kind, lista in pools().items():
        (OUT / f"pool-{kind}.json").write_text(json.dumps(lista, ensure_ascii=False, separators=(",", ":")))
        print("pool", kind, len(lista))
