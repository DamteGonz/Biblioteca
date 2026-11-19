"""Enriquece películas y series con TMDB y genera el mazo para deslizar.

- data/meta/tmdb.json: id del archivo -> datos de TMDB (póster, año, título en español).
- data/pool/movies.json y data/pool/series.json: las más conocidas (por nº de votos)
  estrenadas antes de 2021, para el modo deslizar.

El token se lee de TMDB_TOKEN; en el entorno de Claude lo inyecta el proxy.
"""
import os
import sys
import time

import requests

from common import load, norm, save, split_title

API = "https://api.themoviedb.org/3"
S = requests.Session()
S.headers["Authorization"] = f"Bearer {os.environ.get('TMDB_TOKEN', 'proxy-injected')}"
LANG = "es-ES"


def get(path, **params):
    for intento in range(5):
        r = S.get(f"{API}{path}", params={"language": LANG, **params}, timeout=30)
        if r.status_code == 429:
            time.sleep(2 + intento)
            continue
        r.raise_for_status()
        return r.json()
    r.raise_for_status()


def resumen(kind, x):
    fecha = x.get("release_date") if kind == "movie" else x.get("first_air_date")
    return {
        "tmdbId": x["id"],
        "kind": kind,
        "title": x.get("title") or x.get("name"),
        "original": x.get("original_title") or x.get("original_name"),
        "year": int(fecha[:4]) if fecha else None,
        "poster": x.get("poster_path"),
        "votes": x.get("vote_count", 0),
        "genres": x.get("genre_ids", []),
    }


def buscar(kind, title):
    q, year = split_title(title)
    params = {"query": q}
    if year:
        params["year" if kind == "movie" else "first_air_date_year"] = year
    res = get(f"/search/{kind}", **params)["results"]
    if not res:
        return None
    # Coincidencia exacta (título o título original); si no, el más votado de los 5 primeros.
    exactos = [x for x in res if norm(q) in (norm(x.get("title") or x.get("name") or ""),
                                              norm(x.get("original_title") or x.get("original_name") or ""))]
    elegido = max(exactos or res[:5], key=lambda x: x.get("vote_count", 0))
    return resumen(kind, elegido)


def enriquecer():
    items = load("biblioteca.json")["items"]
    meta = load("meta/tmdb.json", {})
    for it in items:
        if it["type"] not in ("movie", "series") or it["id"] in meta:
            continue
        kind = "movie" if it["type"] == "movie" else "tv"
        m = buscar(kind, it["title"])
        meta[it["id"]] = m
        print(("OK  " if m else "NADA"), it["title"], "->", m and f"{m['title']} ({m['year']})")
    save("meta/tmdb.json", meta)


def pool(kind, paginas):
    fecha = "primary_release_date.lte" if kind == "movie" else "first_air_date.lte"
    out = []
    for p in range(1, paginas + 1):
        res = get(f"/discover/{kind}", sort_by="vote_count.desc", page=p, **{fecha: "2020-12-31"})
        out += [resumen(kind, x) for x in res["results"] if x.get("poster_path")]
    save(f"pool/{'movies' if kind == 'movie' else 'series'}.json", out)
    print(kind, len(out))


if __name__ == "__main__":
    pasos = sys.argv[1:] or ["enriquecer", "pool"]
    if "enriquecer" in pasos:
        enriquecer()
    if "pool" in pasos:
        pool("movie", 100)  # ~2000 películas
        pool("tv", 50)      # ~1000 series
