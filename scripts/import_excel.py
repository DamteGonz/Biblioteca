"""Importa el Excel histórico (2021-2026) a data/biblioteca.json.

Uso: python3 scripts/import_excel.py ruta/al/excel.xlsx

Cada fila del Excel se normaliza con el diccionario MAP (título oficial,
tipo, DLC, anime...). Los títulos que no estén en MAP se importan tal cual
y se marcan con `revisar`.
"""
import json
import re
import sys
from pathlib import Path

import openpyxl

# (hoja, columna título, columna nota, tipo, primera fila)
COLUMNAS = [
    ("2021", "A", "B", "game", 1), ("2021", "D", "E", "series", 1), ("2021", "F", "G", "movie", 1),
    ("2022", "A", "B", "game", 2), ("2022", "D", "E", "movie", 2), ("2022", "F", "G", "series", 2),
    ("2023", "B", "D", "game", 2), ("2023", "F", "G", "movie", 2), ("2023", "I", "J", "series", 2),
    ("2024", "B", "C", "game", 2), ("2024", "H", "I", "movie", 2), ("2024", "M", "N", "series", 2),
    ("2025", "B", "C", "game", 2), ("2025", "H", "I", "movie", 2), ("2025", "M", "N", "series", 2),
    ("2026", "B", "C", "game", 2), ("2026", "H", "I", "movie", 2), ("2026", "M", "N", "series", 2),
]

# Normalización: (tipo, título en minúsculas) -> datos canónicos.
# Campos: t = título oficial, type = cambia el tipo, dlc = juego padre,
# anime = True, revisar = duda pendiente de confirmar.
G, M, S = "game", "movie", "series"
MAP = {
    # ---------- JUEGOS ----------
    (G, "lol"): {"t": "League of Legends"},
    (G, "hs"): {"t": "Hearthstone"},
    (G, "slay the spire"): {"t": "Slay the Spire"},
    (G, "zelda botw"): {"t": "The Legend of Zelda: Breath of the Wild"},
    (G, "witcher 3"): {"t": "The Witcher 3: Wild Hunt"},
    (G, "satisfactory"): {"t": "Satisfactory"},
    (G, "death door"): {"t": "Death's Door"},
    (G, "icarus"): {"t": "Icarus"},
    (G, "slime rancher 2"): {"t": "Slime Rancher 2"},
    (G, "stackland"): {"t": "Stacklands"},
    (G, "marvel snap"): {"t": "Marvel Snap"},
    (G, "cult of lamb"): {"t": "Cult of the Lamb"},
    (G, "obesa"): {"t": "Obesa", "revisar": "No sé qué juego es"},
    (G, "mario odyssey"): {"t": "Super Mario Odyssey"},
    (G, "uncharted"): {"t": "Uncharted: Legacy of Thieves Collection", "revisar": "¿Qué Uncharted?"},
    (G, "star wars jedi 1"): {"t": "Star Wars Jedi: Fallen Order"},
    (G, "v rising"): {"t": "V Rising"},
    (G, "cuyberpunk"): {"t": "Cyberpunk 2077"},
    (G, "god of war"): {"t": "God of War (2018)"},
    (G, "pokemon purpura"): {"t": "Pokémon Violet"},
    (G, "kdh3"): {"t": "Kingdom Hearts III"},
    (G, "ffvii remake"): {"t": "Final Fantasy VII Remake"},
    (G, "sylas"): {"t": "The Mageseeker: A League of Legends Story"},
    (G, "hogwarts"): {"t": "Hogwarts Legacy"},
    (G, "mario wonder"): {"t": "Super Mario Bros. Wonder"},
    (G, "astral ascent"): {"t": "Astral Ascent"},
    (G, "viewfinder"): {"t": "Viewfinder"},
    (G, "gow valhala"): {"t": "God of War Ragnarök: Valhalla", "dlc": "God of War Ragnarök"},
    (G, "remnant ii"): {"t": "Remnant II"},
    (G, "blasphemus 2"): {"t": "Blasphemous 2"},
    (G, "spiderman"): {"t": "Marvel's Spider-Man"},
    (G, "miles morales"): {"t": "Marvel's Spider-Man: Miles Morales"},
    (G, "phantom liberty dlc"): {"t": "Cyberpunk 2077: Phantom Liberty", "dlc": "Cyberpunk 2077"},
    (G, "pokemon anil"): {"t": "Pokémon Violet: The Indigo Disk", "dlc": "Pokémon Violet"},
    (G, "tunic"): {"t": "Tunic"},
    (G, "star wars jedi 2"): {"t": "Star Wars Jedi: Survivor"},
    (G, "the last of us"): {"t": "The Last of Us Part I"},
    (G, "the last of us 2"): {"t": "The Last of Us Part II"},
    (G, "cocoon"): {"t": "Cocoon"},
    (G, "baldur's gate 3"): {"t": "Baldur's Gate 3"},
    (G, "zelda totk"): {"t": "The Legend of Zelda: Tears of the Kingdom"},
    (G, "elden ring"): {"t": "Elden Ring"},
    (G, "no rest for the wicked"): {"t": "No Rest for the Wicked"},
    (G, "prince of persia"): {"t": "Prince of Persia: The Lost Crown"},
    (G, "right and down dice"): {"t": "Right and Down"},
    (G, "talos 1"): {"t": "The Talos Principle"},
    (G, "dragons dogma 2"): {"t": "Dragon's Dogma 2"},
    (G, "duckshot roulette"): {"t": "Buckshot Roulette"},
    (G, "pokemon reminiscencia"): {"t": "Pokémon Reminiscencia", "revisar": "¿Qué Pokémon es?"},
    (G, "palm world"): {"t": "Palworld"},
    (G, "sea of stars"): {"t": "Sea of Stars"},
    (G, "ghost of tsushima"): {"t": "Ghost of Tsushima"},
    (G, "alan wake"): {"t": "Alan Wake 2", "revisar": "¿Alan Wake 1 o 2?"},
    (G, "opus magnun"): {"t": "Opus Magnum"},
    (G, "futbol manager"): {"t": "Football Manager 2024"},
    (G, "megaloot"): {"t": "Megaloot"},
    (G, "inscryption"): {"t": "Inscryption"},
    (G, "marvel rivals"): {"t": "Marvel Rivals"},
    (G, "tft"): {"t": "Teamfight Tactics"},
    (G, "titan souls"): {"t": "Titan Souls"},
    (G, "balatro"): {"t": "Balatro"},
    (G, "dark souls"): {"t": "Dark Souls Remastered"},
    (G, "pokemon z"): {"t": "Pokémon Legends: Z-A", "revisar": "Está en 2024 pero salió en 2025"},
    (G, "shogun"): {"t": "Shogun Showdown", "revisar": "¿Es el juego Shogun Showdown?"},
    (G, "dlc prince of persia"): {"t": "Prince of Persia: The Lost Crown – Mask of Darkness", "dlc": "Prince of Persia: The Lost Crown"},
    (G, "enshrouded"): {"t": "Enshrouded"},
    (G, "wukong"): {"t": "Black Myth: Wukong"},
    (G, "sekiro"): {"t": "Sekiro: Shadows Die Twice"},
    (G, "zelda eow"): {"t": "The Legend of Zelda: Echoes of Wisdom"},
    (G, "indiana jones"): {"t": "Indiana Jones and the Great Circle"},
    (G, "elden ring dlc"): {"t": "Elden Ring: Shadow of the Erdtree", "dlc": "Elden Ring"},
    (G, "lies of p"): {"t": "Lies of P"},
    (G, "a way out"): {"t": "A Way Out"},
    (G, "ffxvi"): {"t": "Final Fantasy XVI"},
    (G, "persona5"): {"t": "Persona 5 Royal"},
    (G, "smite 2"): {"t": "Smite 2"},
    (G, "gordian quest"): {"t": "Gordian Quest"},
    (G, "hades"): {"t": "Hades"},
    (G, "sword of the sea"): {"t": "Sword of the Sea"},
    (G, "lies of p dlc"): {"t": "Lies of P: Overture", "dlc": "Lies of P"},
    (G, "ds3"): {"t": "Dark Souls III"},
    (G, "spiderman 2"): {"t": "Marvel's Spider-Man 2"},
    (G, "doom"): {"t": "Doom: The Dark Ages", "revisar": "¿Doom (2016), Eternal o The Dark Ages?"},
    (G, "kingdom come 2"): {"t": "Kingdom Come: Deliverance II"},
    (G, "khazan"): {"t": "The First Berserker: Khazan"},
    (G, "nightreign"): {"t": "Elden Ring Nightreign"},
    (G, "ff7"): {"t": "Final Fantasy VII Rebirth", "revisar": "¿FF7 Rebirth u otro?"},
    (G, "it takes two"): {"t": "It Takes Two"},
    (G, "expedition 33"): {"t": "Clair Obscur: Expedition 33"},
    (G, "poe2"): {"t": "Path of Exile 2"},
    (G, "indiana jones dlc"): {"t": "Indiana Jones and the Great Circle: The Order of Giants", "dlc": "Indiana Jones and the Great Circle"},
    (G, "ruined king"): {"t": "Ruined King: A League of Legends Story"},
    (G, "mafia"): {"t": "Mafia: The Old Country"},
    (G, "the last flame"): {"t": "The Last Flame"},
    (G, "the_dark_queen_of_mortholme"): {"t": "The Dark Queen of Mortholme"},
    (G, "dispatch"): {"t": "Dispatch"},
    (G, "delta force"): {"t": "Delta Force"},
    (G, "dredge"): {"t": "Dredge"},
    (G, "lords of the fallen"): {"t": "Lords of the Fallen (2023)"},
    (G, "blue prince"): {"t": "Blue Prince"},
    (G, "hollow night"): {"t": "Hollow Knight"},
    (G, "split fiction"): {"t": "Split Fiction"},
    (G, "schedule i"): {"t": "Schedule I"},
    (G, "schedule 1"): {"t": "Schedule I"},
    (G, "hades2"): {"t": "Hades II"},
    (G, "hades 2"): {"t": "Hades II"},
    (G, "doom 2"): {"t": "Doom II"},
    (G, "doom 3"): {"t": "Doom 3"},
    (G, "paper please"): {"t": "Papers, Please"},
    (G, "nier"): {"t": "NieR:Automata"},
    (G, "alters"): {"t": "The Alters"},
    (G, "half life 2"): {"t": "Half-Life 2"},
    (G, "dark dungeon"): {"t": "Darkest Dungeon"},
    (G, "outer wilds"): {"t": "Outer Wilds"},
    (G, "bloodborne"): {"t": "Bloodborne"},
    (G, "slay the spire 2"): {"t": "Slay the Spire 2"},
    (G, "tainted grail"): {"t": "Tainted Grail: The Fall of Avalon"},
    (G, "resident evil 2"): {"t": "Resident Evil 2"},
    (G, "resident evil 3"): {"t": "Resident Evil 3"},
    (G, "resident evil 4"): {"t": "Resident Evil 4"},
    (G, "resident evil 7"): {"t": "Resident Evil 7: Biohazard"},
    (G, "resident evil 9"): {"t": "Resident Evil Requiem"},
    (G, "death stranding"): {"t": "Death Stranding"},
    (G, "mewgenics"): {"t": "Mewgenics"},
    (G, "tom raider"): {"t": "Tomb Raider"},
    (G, "windrose"): {"t": "Windrose"},
    (G, "gang of frogs"): {"t": "Gang of Frogs"},
    (G, "windblown"): {"t": "Windblown"},
    (G, "talos 2"): {"t": "The Talos Principle 2"},
    (G, "shapez 2"): {"t": "shapez 2"},
    (G, "another door"): {"t": "Another Door"},
    (G, "007"): {"t": "007 First Light"},
    (G, "the baazar"): {"t": "The Bazaar"},
    (G, "big walk"): {"t": "The Big Walk"},
    (G, "blood of dawnwalkers"): {"t": "The Blood of Dawnwalker"},
    (G, "moonlighter2"): {"t": "Moonlighter 2"},
    (G, "phantom blade 0"): {"t": "Phantom Blade Zero"},
    (G, "chants of senaar"): {"t": "Chants of Sennaar"},
    (G, "message from deep space"): {"t": "Message from Deep Space"},
    (G, "star wars 0 company"): {"t": "Star Wars Zero Company"},
    (G, "zelda ocarina of time"): {"t": "The Legend of Zelda: Ocarina of Time"},
    (G, "order of the sinking star"): {"t": "Order of the Sinking Star"},
    (G, "cod mw4"): {"t": "Call of Duty: Modern Warfare 4"},
    (G, "castelvania"): {"t": "Castlevania"},
    (G, "sackboy"): {"t": "Sackboy: A Big Adventure"},
    (G, "mario 3d world"): {"t": "Super Mario 3D World + Bowser's Fury"},
    (G, "lego star wars"): {"t": "LEGO Star Wars: The Skywalker Saga"},
    # ---------- PELÍCULAS ----------
    (M, "spiderman no way home"): {"t": "Spider-Man: No Way Home"},
    (M, "the gentleman"): {"t": "The Gentlemen"},
    (M, "el irlandes"): {"t": "The Irishman"},
    (M, "venom"): {"t": "Venom: Let There Be Carnage", "revisar": "¿Venom 1 o 2?"},
    (M, "naruto"): {"t": "Naruto", "type": S, "anime": True},
    (M, "jhon wick"): {"t": "John Wick"},
    (M, "dr strange"): {"t": "Doctor Strange in the Multiverse of Madness"},
    (M, "thor love and thunder"): {"t": "Thor: Love and Thunder"},
    (M, "dont look up"): {"t": "Don't Look Up"},
    (M, "power rangers"): {"t": "Power Rangers"},
    (M, "waknda forevger"): {"t": "Black Panther: Wakanda Forever"},
    (M, "mule"): {"t": "The Mule"},
    (M, "barbie"): {"t": "Barbie"},
    (M, "mario"): {"t": "The Super Mario Bros. Movie"},
    (M, "everyhting everywhere"): {"t": "Everything Everywhere All at Once"},
    (M, "guardianes de la galax"): {"t": "Guardians of the Galaxy Vol. 3"},
    (M, "tetris"): {"t": "Tetris"},
    (M, "air"): {"t": "Air"},
    (M, "spiderman 2"): {"t": "Spider-Man: Across the Spider-Verse", "revisar": "¿Es Cruzando el Multiverso?"},
    (M, "openheimer"): {"t": "Oppenheimer"},
    (M, "road house"): {"t": "Road House (2024)"},
    (M, "the man of earth"): {"t": "The Man from Earth"},
    (M, "man on earth"): {"t": "The Man from Earth"},
    (M, "deadpool wolverine"): {"t": "Deadpool & Wolverine"},
    (M, "indiana jones"): {"t": "Indiana Jones and the Dial of Destiny", "revisar": "¿Qué Indiana Jones?"},
    (M, "dune"): {"t": "Dune"},
    (M, "dragones y mazmorras"): {"t": "Dungeons & Dragons: Honor Among Thieves"},
    (M, "dune 2"): {"t": "Dune: Part Two"},
    (M, "full moon"): {"t": "Full Moon", "revisar": "¿Qué película es?"},
    (M, "dunkerke"): {"t": "Dunkirk"},
    (M, "free guy"): {"t": "Free Guy"},
    (M, "los intocables de eliot nest"): {"t": "The Untouchables"},
    (M, "alphago"): {"t": "AlphaGo"},
    (M, "speak no evil"): {"t": "Speak No Evil"},
    (M, "casino royal"): {"t": "Casino Royale"},
    (M, "hulk"): {"t": "Hulk", "revisar": "¿Hulk (2003) o El increíble Hulk (2008)?"},
    (M, "rocky"): {"t": "Rocky"},
    (M, "witcher"): {"t": "The Witcher: Sirens of the Deep", "revisar": "¿Sirenas de las profundidades?"},
    (M, "jurado numero 2"): {"t": "Juror #2"},
    (M, "otra ronda"): {"t": "Another Round"},
    (M, "die hard"): {"t": "Die Hard"},
    (M, "baby driver"): {"t": "Baby Driver"},
    (M, "bullet train"): {"t": "Bullet Train"},
    (M, "sinners"): {"t": "Sinners"},
    (M, "rocky 4"): {"t": "Rocky IV"},
    (M, "una batalla detras de otra"): {"t": "One Battle After Another"},
    (M, "le mans 66"): {"t": "Ford v Ferrari"},
    (M, "green book"): {"t": "Green Book"},
    (M, "blade runner"): {"t": "Blade Runner", "revisar": "¿Blade Runner (1982) o 2049?"},
    (M, "diamantes en bruto"): {"t": "Uncut Gems"},
    (M, "parasite"): {"t": "Parasite"},
    (M, "dia de entreno"): {"t": "Training Day"},
    (M, "project hail marry"): {"t": "Project Hail Mary"},
    (M, "jumpers"): {"t": "Jumpers", "revisar": "¿Qué película es?"},
    (M, "interstellar"): {"t": "Interstellar"},
    (M, "contact"): {"t": "Contact"},
    (M, "odisea 2001"): {"t": "2001: A Space Odyssey"},
    (M, "american psyco"): {"t": "American Psycho"},
    (M, "regreso al futuro"): {"t": "Back to the Future"},
    (M, "regreso futuro 2"): {"t": "Back to the Future Part II"},
    (M, "7 samurais"): {"t": "Seven Samurai"},
    (M, "ventana indiscreta"): {"t": "Rear Window"},
    (M, "about time"): {"t": "About Time"},
    (M, "odisea"): {"t": "The Odyssey (2026)"},
    (M, "obsession"): {"t": "Obsession", "revisar": "¿Qué película es?"},
    # ---------- SERIES ----------
    (S, "the wicther season 1"): {"t": "The Witcher"},
    (S, "the witcher"): {"t": "The Witcher"},
    (S, "the witcher 4"): {"t": "The Witcher"},
    (S, "rueda del tiempo season 1"): {"t": "The Wheel of Time"},
    (S, "la rueda del tiempo"): {"t": "The Wheel of Time"},
    (S, "rueda del tiempo"): {"t": "The Wheel of Time"},
    (S, "rick e morty"): {"t": "Rick and Morty"},
    (S, "dark"): {"t": "Dark"},
    (S, "the mandalorian"): {"t": "The Mandalorian"},
    (S, "mandalorian3"): {"t": "The Mandalorian"},
    (S, "cyberpunk edgerunners"): {"t": "Cyberpunk: Edgerunners", "anime": True},
    (S, "arcane"): {"t": "Arcane"},
    (S, "el gabinete de las curiosidades"): {"t": "Guillermo del Toro's Cabinet of Curiosities"},
    (S, "wanda vision"): {"t": "WandaVision"},
    (S, "loki"): {"t": "Loki"},
    (S, "obi wan"): {"t": "Obi-Wan Kenobi"},
    (S, "boba fet"): {"t": "The Book of Boba Fett"},
    (S, "the boys"): {"t": "The Boys"},
    (S, "the boys 5"): {"t": "The Boys"},
    (S, "the witcher origenes de sangre"): {"t": "The Witcher: Blood Origin"},
    (S, "house of dracon"): {"t": "House of the Dragon"},
    (S, "house of the dracon"): {"t": "House of the Dragon"},
    (S, "house of dracons"): {"t": "House of the Dragon"},
    (S, "better call saul"): {"t": "Better Call Saul"},
    (S, "ahsoka"): {"t": "Ahsoka"},
    (S, "v gen"): {"t": "Gen V"},
    (S, "gen v"): {"t": "Gen V"},
    (S, "black mirror"): {"t": "Black Mirror"},
    (S, "black mirror 6"): {"t": "Black Mirror"},
    (S, "the last of u"): {"t": "The Last of Us"},
    (S, "the last of us 2"): {"t": "The Last of Us"},
    (S, "peaky blinders"): {"t": "Peaky Blinders"},
    (S, "atack on titan"): {"t": "Attack on Titan", "anime": True},
    (S, "blue eyes samurai"): {"t": "Blue Eye Samurai"},
    (S, "el problema de los 3 cuerpos"): {"t": "3 Body Problem"},
    (S, "fallout"): {"t": "Fallout"},
    (S, "fallout 2"): {"t": "Fallout"},
    (S, "gomorra"): {"t": "Gomorrah"},
    (S, "hxh"): {"t": "Hunter x Hunter", "anime": True},
    (S, "invencible"): {"t": "Invincible"},
    (S, "secret lvl"): {"t": "Secret Level"},
    (S, "next lvl"): {"t": "Secret Level", "revisar": "¿'next lvl' es Secret Level?"},
    (S, "shogun"): {"t": "Shōgun"},
    (S, "suburra"): {"t": "Suburra: Blood on Rome"},
    (S, "alice in borderland"): {"t": "Alice in Borderland"},
    (S, "adolescence"): {"t": "Adolescence"},
    (S, "squid games"): {"t": "Squid Game"},
    (S, "bad guy"): {"t": "Bad Guy", "revisar": "¿Qué serie es?"},
    (S, "pluribus"): {"t": "Pluribus"},
    (S, "love and robots"): {"t": "Love, Death & Robots"},
    (S, "spider noir"): {"t": "Spider-Noir"},
    (S, "dr stone"): {"t": "Dr. Stone", "anime": True},
    (S, "rafa nadal"): {"t": "Rafa Nadal", "revisar": "¿Nombre exacto del documental?"},
    (S, "un caballero de los 7 reinos"): {"t": "A Knight of the Seven Kingdoms"},
    (S, "the greatest"): {"t": "The Greatest", "revisar": "¿Qué serie es?"},
}

# Decisiones que tomaste en el chat (tienen prioridad sobre el Excel).
OVERRIDES = {
    ("game", "Satisfactory"): {"rating": 10},
    ("game", "Slay the Spire"): {"rating": 10},
    ("series", "The Boys"): {"rating": 7, "status": "visto"},
    ("series", "House of the Dragon"): {"rating": 8.5, "status": "en_emision"},
    ("series", "3 Body Problem"): {"rating": 8.5, "status": "en_emision"},
    ("series", "A Knight of the Seven Kingdoms"): {"rating": 9, "status": "en_emision"},
    ("series", "Gen V"): {"rating": 7, "status": "en_curso"},
}


def num(v):
    """Nota numérica redondeada al medio punto (8,4 -> 8,5)."""
    if isinstance(v, (int, float)):
        return round(float(v) * 2) / 2
    return None


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def main(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    items = {}
    for hoja, ct, cn, tipo, r0 in COLUMNAS:
        ws = wb[hoja]
        for r in range(r0, ws.max_row + 1):
            raw = ws[f"{ct}{r}"].value
            if raw is None or not str(raw).strip():
                continue
            raw = str(raw).strip()
            info = MAP.get((tipo, raw.lower()), {"t": raw, "revisar": "Título sin normalizar"})
            t = info.get("type", tipo)
            key = (t, info["t"])
            it = items.setdefault(key, {
                "id": f"{t}-{slug(info['t'])}", "type": t, "title": info["t"],
                "entries": [],
            })
            for k, campo in (("anime", "anime"), ("dlc", "dlcOf"), ("revisar", "revisar")):
                if k in info:
                    it[campo] = info[k]
            it["entries"].append({"year": int(hoja), "excel": raw, "rating": num(ws[f"{cn}{r}"].value)})

    for it in items.values():
        rated = [e for e in it["entries"] if e["rating"] is not None]
        it["years"] = sorted({e["year"] for e in it["entries"]})
        notas = {e["rating"] for e in rated}
        if it["type"] == "series" and len(notas) > 1:
            # Notas distintas en varias temporadas: se pregunta la nota total.
            it["status"] = "visto"
            it["rating"] = None
            it["preguntarNotaTotal"] = True
            it["years"] = sorted({e["year"] for e in rated})
        elif it["type"] == "series" and rated and it["entries"][-1]["rating"] is None:
            # Vista en parte, con temporadas aún por ver.
            it["status"] = "en_curso"
            it["rating"] = rated[-1]["rating"]
            it["years"] = sorted({e["year"] for e in rated})
        elif rated:
            it["status"] = "visto"
            it["rating"] = rated[-1]["rating"]
            it["years"] = sorted({e["year"] for e in rated})
        else:
            it["status"] = "pendiente"
            it["rating"] = None
        it.update(OVERRIDES.get((it["type"], it["title"]), {}))
        if "rating" in OVERRIDES.get((it["type"], it["title"]), {}):
            it.pop("preguntarNotaTotal", None)

    data = sorted(items.values(), key=lambda i: (i["type"], i["title"].lower()))
    out = Path(__file__).resolve().parent.parent / "data" / "biblioteca.json"
    out.write_text(json.dumps({"version": 1, "items": data}, ensure_ascii=False, indent=2))
    print(f"{len(data)} elementos -> {out}")


if __name__ == "__main__":
    main(sys.argv[1])
