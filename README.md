# trapupgrade
Traccar modificado (servidor + web).
- `server/`: Traccar (base commit 102fa46) con grabaciones de tarjeta SD (JT808/JT1078), límite de velocidad OSM por dispositivo y caché.
- `web/`: frontend con sidebar, Cámaras, Report Builder, envío rápido de comandos y marca editable.
- `server-patch.patch`: cambios del servidor como parche.
- `instalar-traccar.sh`: instala en Linux (Raspberry Pi 4 64-bit o Contabo).
Sin compilar ni probar con cámara real: ejecutar `./gradlew test` y `npm run lint && npm run build`.
