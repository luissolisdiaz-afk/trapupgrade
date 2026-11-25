# trapupgrade
Traccar modificado (servidor + web).
- `server/`: Traccar (base commit 102fa46) con grabaciones de tarjeta SD (JT808/JT1078), límite de velocidad OSM por dispositivo y caché.
- `web/`: frontend con sidebar, Cámaras, Report Builder, envío rápido de comandos y marca editable.
- `server-patch.patch`: cambios del servidor como parche.
- `instalar-traccar.sh`: instala en Linux (Raspberry Pi 4 64-bit o Contabo).
Sin compilar ni probar con cámara real: ejecutar `./gradlew test` y `npm run lint && npm run build`.

## Recuperar contraseña por correo
El enlace "Restablecer contraseña" solo aparece cuando Traccar puede enviar correos.
En el servidor, desde la carpeta del repo: `./configurar-correo.sh` (pide la cuenta SMTP y la guarda solo en `/opt/traccar/conf/traccar.xml`, con respaldo previo).
- Gmail: `smtp.gmail.com`, puerto 587, con "contraseña de aplicación" (requiere verificación en 2 pasos).
- Para que el correo llegue en español: Configuración > Servidor > Atributos > Idioma = `es`.
- Cada cliente debe tener un correo real en su usuario; si no, no recibe nada.
