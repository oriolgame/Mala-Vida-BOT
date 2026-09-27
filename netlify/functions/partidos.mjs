// API de BSKT Stats: lista de partidos y equipos seguidos, guardada en Netlify Blobs.
//   GET    /api/partidos            → { partidos: [{id, url}], equipos: [{id, url}] }
//   POST   /api/partidos {enlace}   → añade un partido o un equipo (según el enlace)
//   DELETE /api/partidos?id=…       → quita un partido o un equipo
// Si defines la variable EDIT_PIN en Netlify, añadir/quitar pide ese PIN.
import { getStore } from '@netlify/blobs';
import { idsIn, equipoId } from '../../basquet/fcbq.js';

const KEY = 'lista';
const vacia = () => ({ partidos: [], equipos: [] });
// Lista inicial la primera vez (partido añadido con la versión anterior de la web)
const SEMILLA = {
  partidos: [{ id: '2b5cd3f4-2158-4ada-a4d6-ec5bbbc4080f', url: 'https://www.basquetcatala.cat/estadistica/partit/2b5cd3f4-2158-4ada-a4d6-ec5bbbc4080f' }],
  equipos: [],
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

// Permite sustituir el almacén en pruebas locales
const store = () => globalThis.__bsktStore || getStore({ name: 'bskt-stats', consistency: 'strong' });

async function leer() {
  return { ...vacia(), ...((await store().get(KEY, { type: 'json' })) || SEMILLA) };
}

export default async (req) => {
  const lista = await leer();
  if (req.method === 'GET') return json(lista);

  const pin = process.env.EDIT_PIN;
  if (pin && req.headers.get('x-pin') !== pin) return json({ error: 'PIN incorrecto' }, 401);

  if (req.method === 'POST') {
    const { enlace = '' } = await req.json().catch(() => ({}));
    const ids = idsIn(enlace);
    const eq = ids.length ? null : equipoId(enlace);
    if (ids.length) {
      const nuevos = ids.filter((id) => !lista.partidos.some((p) => p.id === id));
      lista.partidos.push(...nuevos.map((id) => ({ id, url: enlace.trim(), añadido: new Date().toISOString() })));
      await store().setJSON(KEY, lista);
      return json({ ok: true, tipo: 'partido', nuevos, lista });
    }
    if (eq) {
      const nuevo = !lista.equipos.some((e) => e.id === eq);
      if (nuevo) lista.equipos.push({ id: eq, url: enlace.trim(), añadido: new Date().toISOString() });
      await store().setJSON(KEY, lista);
      return json({ ok: true, tipo: 'equipo', nuevos: nuevo ? [eq] : [], lista });
    }
    return json({ error: 'No reconozco el enlace. Pega el enlace de un partido (…/estadistica/partit/…) o de un equipo (…/equip/…) de basquetcatala.cat.' }, 400);
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id');
    lista.partidos = lista.partidos.filter((p) => p.id !== id);
    lista.equipos = lista.equipos.filter((e) => e.id !== id);
    await store().setJSON(KEY, lista);
    return json({ ok: true, lista });
  }

  return json({ error: 'Método no permitido' }, 405);
};

export const config = { path: '/api/partidos' };
