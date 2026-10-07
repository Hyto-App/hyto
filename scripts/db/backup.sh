#!/usr/bin/env bash
# Volcado de solo lectura con pg_dump.
# DATABASE_URL sale del entorno. Este script no lee archivos .env.
# Escribe un archivo con fecha fuera del repo. No toca la base.
# Cómo restaurar: docs/demo-12-oct.md. Aquí no se restaura nada.
set -euo pipefail

if [[ "${1:-}" != "" ]]; then
  echo "Este script no acepta argumentos. La URL sale de DATABASE_URL." >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Falta DATABASE_URL en el entorno. Este script no lee archivos .env." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "No está pg_dump. Instala el cliente de Postgres (postgresql-client)." >&2
  exit 1
fi

repo=$(cd "$(dirname "$0")/../.." && pwd -P)
destino="${HYTO_BACKUP_DIR:-${HOME}/hyto-backups}"
if [[ "$destino" != /* ]]; then
  destino="$(pwd -P)/$destino"
fi
destino=$(realpath -m "$destino")

case "$destino/" in
  "$repo/"*)
    echo "El directorio de salida está dentro del repo. Exporta HYTO_BACKUP_DIR fuera del repositorio." >&2
    exit 1
    ;;
esac

mkdir -p "$destino"
sello=$(date -u +%Y%m%dT%H%M%SZ)
archivo="$destino/hyto-${sello}.dump"

pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --no-password \
  --file "$archivo" \
  --dbname "$DATABASE_URL"

if [[ ! -s "$archivo" ]]; then
  echo "El volcado quedó vacío." >&2
  exit 1
fi

echo "Backup listo: $archivo"
echo "La base no se modificó. Restaurar es manual. Lee docs/demo-12-oct.md."
echo "No restaures en producción salvo que Jayden o Josué lo pidan."
