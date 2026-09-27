# BSKT Stats

Web gratuita que cuenta puntos, canastas de 2, triples, tiros libres y faltas (y rebotes,
asistencias… si vienen) a partir del **jugada a jugada** de basquetcatala.cat.

**Web:** https://oriolgame.github.io/Mala-Vida-BOT/

## Cómo se usa
1. Abre el partido en basquetcatala.cat y copia el enlace.
2. En la web, pégalo y pulsa **＋ Añadir** → se abre GitHub con todo rellenado → pulsa **Create**.
3. Listo: GitHub Actions lo guarda, y cada 10 minutos actualiza las estadísticas solo.

Para quitar un partido, pulsa 🗑️ junto al selector.

## Cómo funciona por dentro
- `scripts/fcbq-update.mjs` descarga el jugada a jugada y genera `basquet/data/partidos.json`.
- `.github/workflows/fcbq.yml` se ejecuta cada 10 minutos, al abrir una issue desde la web
  (solo las del propietario/colaboradores) y en cada cambio; publica la web en la rama `gh-pages`.
- Las páginas de equipo de basquetcatala.cat están protegidas con reCAPTCHA, por eso los partidos
  se añaden por enlace.
