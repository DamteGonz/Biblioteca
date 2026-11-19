#!/usr/bin/env bash
# Ejecuta un fichero SQL en el proyecto de Supabase con la API de gestión.
# El token (SUPABASE_ACCESS_TOKEN) lo inyecta el proxy en el entorno de Claude.
set -euo pipefail
REF=kczcxklecbmkdlzxbzar
python3 -c 'import json,sys; print(json.dumps({"query": open(sys.argv[1]).read()}))' "$1" |
  curl -sS -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN:-proxy-injected}" \
    -H "Content-Type: application/json" --data-binary @-
echo
