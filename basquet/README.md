# BSKT Stats

Web gratuita (Netlify) que cuenta puntos, canastas de 2, triples, tiros libres y faltas
(y rebotes, asistencias… si vienen) a partir del **jugada a jugada** de basquetcatala.cat.

## Cómo se usa
Pega en la web el enlace de:
- **un equipo** (`https://www.basquetcatala.cat/equip/…`) → se buscan sus partidos jugados y por jugar, o
- **un partido** (`https://www.basquetcatala.cat/estadistica/partit/…`).

Todo se actualiza solo cada minuto mientras tienes la web abierta.

## Cómo funciona por dentro
- `basquet/` es la web; `basquet/fcbq.js` convierte el jugada a jugada en estadísticas.
- `netlify/functions/partidos.mjs` guarda la lista de partidos y equipos en Netlify Blobs (`/api/partidos`).
- `netlify.toml` hace de proxy de `/fcbq/*` al servidor de estadísticas de la FCBQ,
  así el navegador lee los datos en directo sin problemas de CORS.
- Opcional: define la variable de entorno `EDIT_PIN` en Netlify para que añadir/quitar pida un PIN.
- Las páginas de basquetcatala.cat están protegidas con reCAPTCHA; los partidos de un equipo
  se buscan con la función `team-stats` del servidor de estadísticas (experimental).
