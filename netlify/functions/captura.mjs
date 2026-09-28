// Capturas de páginas de basquetcatala.cat enviadas con el botón «Enviar a BSKT Stats».
//   POST /api/captura      → guarda la captura (JSON) y devuelve su id
//   GET  /api/captura      → índice de capturas (id, fecha, url, título)
//   GET  /api/captura?id=… → una captura completa
import { getStore } from '@netlify/blobs';

const store = () => globalThis.__bsktStore || getStore({ name: 'bskt-stats', consistency: 'strong' });
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async (req) => {
  const st = store();
  const indice = (await st.get('capturas', { type: 'json' })) || [];
  if (req.method === 'GET') {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json(indice);
    const c = await st.get('captura-' + id, { type: 'json' });
    return c ? json(c) : json({ error: 'No existe' }, 404);
  }
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  // Llega desde el botón como formulario (campo «datos») o como JSON
  const esForm = (req.headers.get('content-type') || '').includes('application/x-www-form-urlencoded');
  const texto = esForm ? String((await req.formData()).get('datos') || '') : await req.text();
  if (texto.length > 5e6) return json({ error: 'Captura demasiado grande' }, 413);
  let c;
  try { c = JSON.parse(texto); } catch { return json({ error: 'JSON no válido' }, 400); }
  const id = Date.now().toString(36);
  await st.setJSON('captura-' + id, { ...c, recibida: new Date().toISOString() });
  indice.unshift({ id, fecha: new Date().toISOString(), url: String(c.url || '').slice(0, 300), titulo: String(c.titulo || '').slice(0, 200) });
  await st.setJSON('capturas', indice.slice(0, 50));
  if (esForm) return new Response(null, { status: 303, headers: { location: `/importar.html?id=${id}` } });
  return json({ ok: true, id });
};

export const config = { path: '/api/captura' };
