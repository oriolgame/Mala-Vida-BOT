// Lógica de BSKT Stats: convierte el jugada a jugada de la FCBQ en estadísticas.
// Módulo compartido: lo usa la web (navegador) y las funciones de Netlify.

// ---------- utilidades ----------
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();


// IDs de partido: 24 hex (tipo Mongo) o UUID
const ID_RE = /\b([0-9a-f]{24}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/gi;
export const idsIn = (s) => [...new Set([...String(s).matchAll(ID_RE)].map((m) => m[1].toLowerCase()))];

// Busca recursivamente el array más largo de objetos que parezcan jugadas
function findMoves(node, best = []) {
  if (Array.isArray(node)) {
    const objs = node.filter((x) => x && typeof x === 'object' && !Array.isArray(x));
    if (objs.length > best.length && objs.some((o) => moveText(o))) best = objs;
    for (const x of node) best = findMoves(x, best);
  } else if (node && typeof node === 'object') {
    for (const v of Object.values(node)) best = findMoves(v, best);
  }
  return best;
}

const pick = (o, re) => {
  for (const [k, v] of Object.entries(o)) if (re.test(k) && v != null && v !== '' && typeof v !== 'object') return v;
};
const moveText = (o) => pick(o, /^(move|movedescription|description|desc|action|accion|accio|text|type|typename|movename)$/i);
const playerName = (o) => pick(o, /^(actorname|playername|player|name|nom|nombre|jugador)$/i);
const shirt = (o) => pick(o, /^(actorshirtnumber|shirtnumber|dorsal|number|num)$/i);
const teamId = (o) => pick(o, /^(idteam|teamid|team|idequip|equip|teamidintern|idteamintern)$/i);
const period = (o) => pick(o, /^(period|periode|quarter|cuarto|part)$/i);

// ---------- clasificación de jugadas (catalán / castellano) ----------
export function classify(text) {
  const t = norm(text);
  if (!t) return null;
  if (/(canvi|cambio|substitu|sustitu|entra |surt |sale |temps mort|tiempo muerto|inici|final del|fi del|comenca)/.test(t)) return { ignore: true };

  if (/falta|foul/.test(t)) {
    if (/(rebuda|recibida|provocada|received)/.test(t)) return { stat: 'faltasRecibidas' };
    let kind = 'personal';
    if (/tecnica/.test(t)) kind = 'tecnica';
    else if (/(antiesport|antidepor|unsport)/.test(t)) kind = 'antideportiva';
    else if (/(desqualif|descalif)/.test(t)) kind = 'descalificante';
    return { stat: 'faltas', kind };
  }

  const miss = /(fall|errad|errat|fallo|no anot|no conv|missed)/.test(t);
  let shot = null;
  if (/(lliure|libre|\bt1\b|de 1\b|1 punt|\btl\b)/.test(t)) shot = 1;
  else if (/(triple|de 3\b|3 punt|\bt3\b|3pt)/.test(t)) shot = 3;
  else if (/(de 2\b|2 punt|\bt2\b|2pt|cistella|canasta|esmaixad|mate|safata|bandeja|tir|tiro)/.test(t)) shot = 2;
  if (shot) return { shot, made: !miss };

  if (/rebot|rebote/.test(t)) return { stat: 'rebotes' };
  if (/assist|asist/.test(t)) return { stat: 'asistencias' };
  if (/(recuper|robo|robat)/.test(t)) return { stat: 'robos' };
  if (/(perdu|perdi)/.test(t)) return { stat: 'perdidas' };
  if (/(tap|bloq)/.test(t)) return { stat: 'tapones' };
  return null;
}

const emptyLine = () => ({
  puntos: 0, t1: 0, t1i: 0, t2: 0, t2i: 0, t3: 0, t3i: 0,
  faltas: 0, tecnicas: 0, antideportivas: 0, faltasRecibidas: 0,
  rebotes: 0, asistencias: 0, robos: 0, perdidas: 0, tapones: 0,
});

function add(line, c) {
  if (c.shot) {
    line[`t${c.shot}i`]++;
    if (c.made) { line[`t${c.shot}`]++; line.puntos += c.shot; }
  } else if (c.stat === 'faltas') {
    line.faltas++;
    if (c.kind === 'tecnica') line.tecnicas++;
    if (c.kind === 'antideportiva') line.antideportivas++;
  } else if (c.stat) line[c.stat]++;
}

// Nombres de los equipos: se buscan en cualquier objeto {id, nombre} de los JSON
function teamNames(...docs) {
  const map = {};
  const walk = (n) => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (!n || typeof n !== 'object') return;
    const id = pick(n, /^(idteam|teamid|id|teamidintern|idteamintern|idequip)$/i);
    const name = pick(n, /^(name|teamname|nom|nomequip|nombre|shortname)$/i);
    if (id != null && name && (/team|equip/i.test(Object.keys(n).join(' ')) || Array.isArray(n.players))) map[String(id)] ??= String(name);
    Object.values(n).forEach(walk);
  };
  docs.forEach(walk);
  return map;
}

export function buildMatch(id, movesJson, statsJson) {
  const moves = findMoves(movesJson);
  const names = teamNames(statsJson, movesJson);
  const teams = {};
  const unknown = {};
  let lastPeriod = null;

  for (const m of moves) {
    const text = moveText(m);
    const c = classify(text);
    const p = period(m);
    if (p != null) lastPeriod = p;
    if (!c) { const k = String(text); unknown[k] = (unknown[k] || 0) + 1; continue; }
    if (c.ignore) continue;
    const tid = String(teamId(m) ?? '?');
    const team = (teams[tid] ??= { id: tid, nombre: names[tid] || `Equipo ${tid}`, total: emptyLine(), jugadores: {}, porPeriodo: {} });
    add(team.total, c);
    if (c.shot && c.made && p != null) team.porPeriodo[p] = (team.porPeriodo[p] || 0) + c.shot;
    const name = playerName(m);
    if (name && !/^(equip|equipo|team|banqueta|banquillo|entrenador)/i.test(norm(name))) {
      const d = shirt(m);
      const key = `${d ?? ''}|${name}`;
      const pl = (team.jugadores[key] ??= { nombre: String(name), dorsal: d != null ? String(d) : '', ...emptyLine() });
      add(pl, c);
    }
  }

  const equipos = Object.values(teams).map((t) => ({
    ...t,
    jugadores: Object.values(t.jugadores).sort((a, b) => b.puntos - a.puntos || a.nombre.localeCompare(b.nombre)),
  }));
  return {
    id,
    periodoActual: lastPeriod,
    jugadas: moves.length,
    equipos,
    marcador: equipos.map((e) => e.total.puntos).join(' - '),
    jugadasNoReconocidas: unknown,
  };
}

// Temporada de la FCBQ en curso (empieza en agosto): septiembre 2026 → 2026
export const temporadaActual = (d = new Date()) => (d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1);

// Número de equipo en un enlace de basquetcatala.cat (…/equip/73258)
export const equipoId = (s) => (String(s).match(/equip(?:o)?\/(\d{3,})/i) || String(s).match(/^\s*(\d{3,})\s*$/) || [])[1] || null;
