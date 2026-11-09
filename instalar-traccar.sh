#!/usr/bin/env bash
# Instala NUESTRA version de Traccar en Linux (Raspberry Pi 4 64-bit o Contabo).
# Uso: ./instalar-traccar.sh server-patch.patch traccar-web-recordings.zip
set -euo pipefail
PATCH="$(readlink -f "$1")"; WEBZIP="$(readlink -f "$2")"
BASE=102fa46   # commit de Traccar sobre el que se hizo el parche
sudo apt update
sudo apt install -y openjdk-17-jdk git unzip ffmpeg nodejs npm
WORK=$HOME/traccar-build; mkdir -p "$WORK"; cd "$WORK"
[ -d traccar ] || git clone --recursive https://github.com/traccar/traccar.git
cd traccar && git checkout -q $BASE && git submodule update --init --recursive
git apply "$PATCH"
./gradlew assemble
# --- web ---
cd "$WORK" && rm -rf web && mkdir web && unzip -q "$WEBZIP" -d web && cd web/*/
npm ci && npm run build
WEBBUILD=$(pwd)/build
# --- instalar ---
sudo systemctl stop traccar 2>/dev/null || true
sudo mkdir -p /opt/traccar/{conf,data,logs,web,media}
sudo cp -r "$WORK/traccar/target/tracker-server.jar" "$WORK/traccar/target/lib" /opt/traccar/
[ -f /opt/traccar/conf/traccar.xml ] || sudo cp "$WORK/traccar/setup/traccar.xml" /opt/traccar/conf/
sudo rm -rf /opt/traccar/web/* && sudo cp -r "$WEBBUILD"/* /opt/traccar/web/
sudo tee /etc/systemd/system/traccar.service >/dev/null <<'UNIT'
[Unit]
Description=Traccar
After=network.target
[Service]
WorkingDirectory=/opt/traccar
ExecStart=/usr/bin/java -Xmx2g -jar tracker-server.jar conf/traccar.xml
Restart=always
[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload && sudo systemctl enable --now traccar
echo "Listo: http://IP:8082  (logs: journalctl -u traccar -f)"
