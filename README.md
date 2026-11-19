# Biblioteca

Archivo personal de películas, series, videojuegos y libros, con nota del 1 al 10 (medios puntos).

- `data/biblioteca.json`: todo el archivo (2021 en adelante + pendientes).
- `scripts/import_excel.py`: importa el Excel histórico → `data/biblioteca.json`.

## Estados
- `visto`: visto/jugado y con nota.
- `pendiente`: lista de cosas por ver o jugar.
- `en_curso`: series vistas en parte, con temporadas por ver.
- `en_emision`: series sin terminar; la nota se revisa con cada temporada nueva.

Los elementos con `revisar` tienen el título por confirmar.
