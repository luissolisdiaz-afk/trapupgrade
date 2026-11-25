# Traccar personalizado (Roadsafe) — contexto del proyecto

Traccar 6.17 (servidor Java 21 + web React 19/MUI/Vite) con cambios propios.
Idioma de trabajo con el dueño: **español**. Producción: gps.roadsafe.cl (Contabo, nginx + SSL, MySQL).
Pruebas: Raspberry Pi 4 con Ubuntu Server (web en :8082, GPS GT06 en :5023, DNS dinámico DuckDNS).

## Estructura
- `server/`  código Java modificado (clon de Traccar base 102fa46). `server-patch.patch` es el mismo cambio como parche.
- `web/`     web React (Vite). `web/src/resources/l10n/*.json` idiomas (es y en completos; el resto cae a inglés).
- `instalar-traccar.sh` instalador desde cero (Ubuntu/Debian). `README.md` pasos.

## Cómo desplegar (un bloque a la vez)
Web:
    cd ~/trapupgrade && git pull
    cd web && npm run build            # la primera vez: npm ci
    sudo rsync -a --delete --exclude node_modules ~/trapupgrade/web/build/ /opt/traccar/web/
Servidor:
    cd ~/traccar-build/traccar && git checkout . && git clean -fd && git apply ~/trapupgrade/server-patch.patch && ./gradlew assemble
    sudo systemctl stop traccar && sudo cp -r target/tracker-server.jar target/lib /opt/traccar/ && sudo systemctl start traccar
Si cambias `server/`, regenera `server-patch.patch` (diff contra 102fa46) y comprueba que aplica limpio.
Checkstyle prohíbe imports sin usar. Instalación necesita `schema/` y `templates/` en /opt/traccar.

## Lo que ya se hizo (todo sin probar en hardware real)
- Panel de cámaras DVR (HLS en memoria, máx. 4 en vivo, corte por inactividad 30 s y aviso "¿Sigues mirando?" a los 10 min).
- Perfiles por tipo de cliente (`useClientType`: admin / empresa = Dashboard activado / particular) y hoja móvil del cliente particular con deslizar para cortar/habilitar motor.
- Corte de motor por equipo (relé / Traccar / personalizado), catálogo de comandos con asignación a equipo.
- Equipos por usuario, edición restringida para clientes, geocercas con asignación de equipos, eventos con selector de equipos y exceso de velocidad (límite del mapa vía OSM/Overpass o velocidad propia).
- Alertas de eventos por WhatsApp con Evolution API (número de la empresa configurado en Configuración → Servidor; notificador `evolution`).
- Mantenimientos simples por perfil (distancia, horas, fecha), errores del servidor en español, reconexión del socket, compartir enlace sin error 409.
- Accesibilidad según Web Interface Guidelines de Vercel (nombres en botones de icono, teclado, `lang`).
- Tarjeta de vehículo: resumen (velocidad, última señal, dirección) vinculado a "Información emergente"; patente visible.
- Revisión automática en GitHub Actions (`.github/workflows/revision.yml`): compila y prueba `server/` (checkstyle incluido), lint y build de `web/`, y comprueba que `server-patch.patch` coincide con `server/`.

## Pendiente / ideas
- Probar todo con equipos reales (GPS GT06/VL110C, dashcam JT808/JT1078 de ULV: puertos 5058 JT808, 5059 video, 5060 adjuntos; `web.url` debe apuntar al dominio del servidor).
- Decidir el 0xE1 de 1 byte del protocolo ULV (aceleración/frenada/giro brusco) frente a batería en `Jt808ProtocolDecoder`.
- Notas de conducción 0,0 a 5,0 por conductor (frenadas/aceleraciones/giros/exceso por 100 km) e identificación con RFID/iButton.
- Traducir los 273 textos faltantes a los otros 59 idiomas (empezar por pt, fr, de, it, ru, zh, ja, ar, tr, hi).
- Overpass propio para límites de velocidad (VPS aparte, nunca en el de producción); push con `notificator.traccar.key` (traccar.org) o Firebase para app propia.
- App móvil propia (Android primero, iOS después); por ahora Traccar Manager carga la web.
- Revisión de seguridad (nginx: cabeceras y límite de peticiones; `registration` apagado; MySQL solo en localhost).

## Reglas
- Nunca escribir contraseñas, tokens ni claves en el repositorio ni en chats.
- No tocar el servidor de producción sin respaldo previo de la base de datos.
- Todo cambio de servidor y web debe quedar en este repositorio.
