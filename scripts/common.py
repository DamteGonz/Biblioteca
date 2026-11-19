"""Utilidades compartidas por los scripts de enriquecimiento."""
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def load(name, default=None):
    p = DATA / name
    if p.exists():
        return json.loads(p.read_text())
    return default


def save(name, obj):
    p = DATA / name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=1) + "\n")


def norm(s):
    """Normaliza un título para comparar: sin acentos, minúsculas, solo letras y números."""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = s.lower().replace("&", "and")
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def split_title(title):
    """'Hulk (2003)' -> ('Hulk', 2003); 'Rafa Nadal (documental)' -> ('Rafa Nadal', None)."""
    m = re.match(r"^(.*?)\s*\((\d{4})\)\s*$", title)
    if m:
        return m.group(1), int(m.group(2))
    return re.sub(r"\s*\(.*\)\s*$", "", title), None
