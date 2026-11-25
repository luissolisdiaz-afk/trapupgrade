#!/usr/bin/env bash
# Activa el envio de correos en Traccar (recuperar contrasena y alertas por correo).
# Pregunta los datos de la cuenta de correo y los guarda SOLO en /opt/traccar/conf/traccar.xml
# (nunca en este repositorio). Uso:  ./configurar-correo.sh
#
# Datos tipicos:
#   Gmail:  servidor smtp.gmail.com, puerto 587, usuario tu@gmail.com,
#           contrasena = "contrasena de aplicacion" (myaccount.google.com > Seguridad >
#           Verificacion en 2 pasos > Contrasenas de aplicaciones). La normal NO sirve.
#   Brevo:  servidor smtp-relay.brevo.com, puerto 587, usuario y clave SMTP del panel de Brevo.
set -euo pipefail
CONF=/opt/traccar/conf/traccar.xml
[ -f "$CONF" ] || { echo "No existe $CONF. Instala Traccar primero."; exit 1; }

read -rp "Direccion de la web (ej. https://gps.roadsafe.cl): " WEBURL
read -rp "Servidor SMTP [smtp.gmail.com]: " HOST; HOST=${HOST:-smtp.gmail.com}
read -rp "Puerto [587]: " PORT; PORT=${PORT:-587}
read -rp "Usuario (correo): " USER_MAIL
read -rsp "Contrasena (no se muestra): " PASS; echo
read -rp "Correo remitente [$USER_MAIL]: " FROM; FROM=${FROM:-$USER_MAIL}
read -rp "Nombre remitente [Roadsafe GPS]: " FROMNAME; FROMNAME=${FROMNAME:-Roadsafe GPS}

sudo cp "$CONF" "$CONF.respaldo-$(date +%Y%m%d-%H%M%S)"

# python3 edita el XML y escapa caracteres especiales de la contrasena (&, <, >, comillas)
sudo env WEBURL="$WEBURL" HOST="$HOST" PORT="$PORT" USER_MAIL="$USER_MAIL" PASS="$PASS" \
  FROM="$FROM" FROMNAME="$FROMNAME" CONF="$CONF" python3 - <<'PY'
import os, re
from xml.sax.saxutils import escape
e = os.environ
ssl = e['PORT'] == '465'
entries = {
    'web.url': e['WEBURL'].rstrip('/'),
    'mail.smtp.host': e['HOST'],
    'mail.smtp.port': e['PORT'],
    'mail.smtp.ssl.enable': 'true' if ssl else 'false',
    'mail.smtp.starttls.enable': 'false' if ssl else 'true',
    'mail.smtp.auth': 'true',
    'mail.smtp.username': e['USER_MAIL'],
    'mail.smtp.password': e['PASS'],
    'mail.smtp.from': e['FROM'],
    'mail.smtp.fromName': e['FROMNAME'],
}
text = open(e['CONF'], encoding='utf-8').read()
for key in entries:
    text = re.sub(r"\s*<entry key=['\"]" + re.escape(key) + r"['\"]\s*(/>|>.*?</entry>)", '', text, flags=re.S)
new = ''.join("    <entry key='%s'>%s</entry>\n" % (k, escape(v)) for k, v in entries.items())
text = text.replace('</properties>', new + '</properties>')
open(e['CONF'], 'w', encoding='utf-8').write(text)
PY
sudo chmod 640 "$CONF"

sudo systemctl restart traccar
echo "Listo. En unos segundos aparecera 'Restablecer contrasena' en la pantalla de inicio."
echo "Para que el correo llegue en espanol: Configuracion > Servidor > Atributos > Idioma = es."
echo "Si no llega, revisa: journalctl -u traccar -n 100 | grep -i mail"
