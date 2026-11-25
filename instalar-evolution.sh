#!/usr/bin/env bash
# Instala Evolution API v2 (puente de WhatsApp) con Docker, junto a PostgreSQL y Redis.
# Pensado para la Raspberry Pi 4 (arm64) o un VPS Ubuntu/Debian. Uso:
#   sudo bash instalar-evolution.sh
# La clave API se genera aqui y queda solo en /opt/evolution/.env (nunca en el repositorio).
set -euo pipefail

DIR=/opt/evolution
PUERTO=${PUERTO:-8080}
IMAGEN=${IMAGEN:-evoapicloud/evolution-api:v2.3.7}

if [ "$(id -u)" -ne 0 ]; then
  echo "Ejecuta con sudo: sudo bash $0" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "== Instalando Docker =="
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

mkdir -p "$DIR"
cd "$DIR"

if [ ! -f .env ]; then
  echo "== Generando claves =="
  CLAVE_API=$(openssl rand -hex 24)
  CLAVE_DB=$(openssl rand -hex 16)
  IP=$(hostname -I | awk '{print $1}')
  cat > .env <<EOF
SERVER_TYPE=http
SERVER_PORT=8080
SERVER_URL=http://${IP}:${PUERTO}
AUTHENTICATION_API_KEY=${CLAVE_API}
AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true
DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://evolution:${CLAVE_DB}@postgres:5432/evolution?schema=public
DATABASE_CONNECTION_CLIENT_NAME=evolution_v2
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://redis:6379/6
CACHE_REDIS_PREFIX_KEY=evolution_v2
CACHE_REDIS_SAVE_INSTANCES=false
CACHE_LOCAL_ENABLED=false
LANGUAGE=es
POSTGRES_USER=evolution
POSTGRES_PASSWORD=${CLAVE_DB}
POSTGRES_DB=evolution
EOF
  chmod 600 .env
fi

cat > docker-compose.yml <<EOF
services:
  evolution-api:
    container_name: evolution_api
    image: ${IMAGEN}
    restart: always
    ports:
      - "${PUERTO}:8080"
    env_file: .env
    volumes:
      - evolution_instances:/evolution/instances
    depends_on:
      - postgres
      - redis

  postgres:
    container_name: evolution_postgres
    image: postgres:16-alpine
    restart: always
    env_file: .env
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    container_name: evolution_redis
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  evolution_instances:
  postgres_data:
  redis_data:
EOF

echo "== Iniciando Evolution API (la primera vez tarda unos minutos en descargar) =="
docker compose up -d

IP=$(hostname -I | awk '{print $1}')
CLAVE_API=$(grep '^AUTHENTICATION_API_KEY=' .env | cut -d= -f2)
echo
echo "Listo. Evolution API queda en: http://${IP}:${PUERTO}"
echo "Panel para crear la instancia y escanear el QR: http://${IP}:${PUERTO}/manager"
echo "Clave API (guardala en un lugar seguro, no la compartas):"
echo "  ${CLAVE_API}"
echo
echo "En Traccar (Configuracion > Servidor > WhatsApp de la empresa):"
echo "  Direccion: http://localhost:${PUERTO}   (si Traccar esta en esta misma maquina)"
echo "  Instancia: el nombre que le pongas en el panel"
echo "  Clave API: la de arriba"
echo
echo "No abras el puerto ${PUERTO} en el router: solo se usa dentro de tu red."
