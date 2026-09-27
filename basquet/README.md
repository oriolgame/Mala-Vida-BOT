# BSKT Stats

Web gratuita (GitHub Pages) que lee el **jugada a jugada** de basquetcatala.cat y cuenta
puntos, canastas de 2, triples, tiros libres, faltas (y rebotes, asistencias, etc. si vienen).

## Puesta en marcha (una sola vez)
1. Mezcla esta rama en la rama principal del repositorio.
2. GitHub → **Settings → Pages → Source: Deploy from a branch → `gh-pages`** (normalmente se activa solo).
3. Edita `basquet/config.json` y pega en `partidos` el enlace de cada partido
   (`https://www.basquetcatala.cat/estadistiques/<temporada>/<id>`).
   Las páginas de equipo no se pueden leer automáticamente: la FCBQ las protege con reCAPTCHA.

A partir de ahí, cada 10 minutos GitHub Actions descarga los partidos y actualiza la web:
`https://<usuario>.github.io/<repo>/basquet/`
