# trapupgrade
Traccar modificado (servidor + web).
- `server/`: Traccar (base commit 102fa46) con grabaciones de tarjeta SD (JT808/JT1078), límite de velocidad OSM por dispositivo y caché.
- `web/`: frontend con sidebar, Cámaras, Report Builder, envío rápido de comandos y marca editable.
- `server-patch.patch`: cambios del servidor como parche.
- `instalar-traccar.sh`: instala en Linux (Raspberry Pi 4 64-bit o Contabo).
Sin compilar ni probar con cámara real: ejecutar `./gradlew test` y `npm run lint && npm run build`.

## Alertas por WhatsApp (Evolution API)
Las notificaciones de eventos pueden salir por WhatsApp desde el número de Roadsafe, usando una instancia propia de [Evolution API](https://doc.evolution-api.com) (v2).
0. Instalar Evolution (Raspberry o VPS, nunca el servidor de producción): `sudo bash instalar-evolution.sh`. Al final muestra la dirección del panel y la clave API.
1. En Evolution (panel `/manager`), crea una instancia y conéctala escaneando el QR con el teléfono del número de eventos.
2. En la web: Configuración → Servidor → "WhatsApp de la empresa (Evolution API)": dirección, nombre de la instancia, clave API y código de país (56 por defecto). Guardar. No hace falta reiniciar ni tocar `traccar.xml`.
3. Cada usuario debe tener su teléfono en su cuenta. En cada notificación, elegir el canal "WhatsApp" y probar con "Probar notificadores".
El texto es el resumen corto de cada evento (o el texto personalizado del usuario) más un enlace a Google Maps. La clave nunca se muestra en la API (los administradores ven asteriscos).
