"""Enriquece los juegos con IGDB y genera el mazo de juegos para deslizar.

Se ejecuta en GitHub Actions (.github/workflows/igdb.yml), que tiene el secreto
TWITCH_CLIENT_SECRET.

- data/meta/igdb.json: id del archivo -> datos de IGDB (portada, año, plataformas).
- data/pool/games.json: los juegos más valorados lanzados antes de 2021.
"""
import os
import sys
import time

import requests

from common import load, norm, save, split_title

CLIENT_ID = os.environ.get("TWITCH_CLIENT_ID", "6ex437z0ud53iypu7gjokf1nifqgtq")
SECRET = os.environ["TWITCH_CLIENT_SECRET"]
CAMPOS = ("fields name,cover.image_id,first_release_date,total_rating_count,"
          "genres.name,platforms.abbreviation,parent_game.name;")
ANTES_2021 = 1609459200  # 2021-01-01 en segundos


def token():
    r = requests.post("https://id.twitch.tv/oauth2/token", data={
        "client_id": CLIENT_ID, "client_secret": SECRET, "grant_type": "client_credentials"}, timeout=30)
    r.raise_for_status()
    return r.json()["access_token"]


S = requests.Session()


def q(endpoint, body):
    for intento in range(5):
        time.sleep(0.3)  # IGDB permite 4 peticiones por segundo
        r = S.post(f"https://api.igdb.com/v4/{endpoint}", data=body.encode(), timeout=30)
        if r.status_code == 429:
            time.sleep(1 + intento)
            continue
        if r.status_code >= 400:
            print("ERROR", r.status_code, r.text[:300], "\n", body)
        r.raise_for_status()
        return r.json()
    r.raise_for_status()


def resumen(x):
    ts = x.get("first_release_date")
    return {
        "igdbId": x["id"],
        "title": x["name"],
        "year": time.gmtime(ts).tm_year if ts else None,
        "cover": (x.get("cover") or {}).get("image_id"),
        "votes": x.get("total_rating_count", 0),
        "genres": [g["name"] for g in x.get("genres", [])],
        "platforms": [p.get("abbreviation") for p in x.get("platforms", []) if p.get("abbreviation")],
        "parent": (x.get("parent_game") or {}).get("name"),
    }


def buscar(title):
    nombre, _ = split_title(title)
    seguro = nombre.replace('"', "")
    res = q("games", f'search "{seguro}"; {CAMPOS} where version_parent = null; limit 10;')
    if not res:
        return None
    exactos = [x for x in res if norm(x["name"]) == norm(nombre)]
    elegido = max(exactos, key=lambda x: x.get("total_rating_count", 0)) if exactos else res[0]
    out = resumen(elegido)
    out["exacto"] = bool(exactos)
    return out


def enriquecer():
    items = load("biblioteca.json")["items"]
    meta = load("meta/igdb.json", {})
    for it in items:
        if it["type"] != "game" or it.get("hackrom") or it["id"] in meta:
            continue
        m = buscar(it["title"])
        meta[it["id"]] = m
        marca = "OK  " if m and m["exacto"] else ("~   " if m else "NADA")
        print(marca, it["title"], "->", m and f"{m['title']} ({m['year']})")
    save("meta/igdb.json", meta)


def pool(n=1500):
    out = []
    for offset in range(0, n, 500):
        res = q("games", f"{CAMPOS} where first_release_date < {ANTES_2021} & total_rating_count > 20 "
                         f"& parent_game = null & version_parent = null & cover != null; "
                         f"sort total_rating_count desc; limit 500; offset {offset};")
        out += [resumen(x) for x in res]
    save("pool/games.json", out)
    print("games", len(out), [x["title"] for x in out[:10]])


if __name__ == "__main__":
    S.headers.update({"Client-ID": CLIENT_ID, "Authorization": f"Bearer {token()}"})
    pasos = sys.argv[1:] or ["enriquecer", "pool"]
    if "enriquecer" in pasos:
        enriquecer()
    if "pool" in pasos:
        pool()
