// Guarda los resultados de /diagnostico.html (pruebas hechas desde el navegador del usuario)
// para poder revisarlos después.  POST → guarda · GET → últimos informes
import { getStore } from '@netlify/blobs';

const store = () => globalThis.__bsktStore || getStore('bskt-stats');
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async (req, context) => {
  const informes = (await store().get('diagnostico', { type: 'json' })) || [];
  if (req.method === 'GET') return json(informes);
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  const texto = (await req.text()).slice(0, 30000);
  let informe;
  try { informe = JSON.parse(texto); } catch { return json({ error: 'JSON no válido' }, 400); }
  informes.unshift({ fecha: new Date().toISOString(), pais: context?.geo?.country?.code || null, ciudad: context?.geo?.city || null, informe });
  await store().setJSON('diagnostico', informes.slice(0, 10));
  return json({ ok: true });
};

export const config = { path: '/api/diagnostico' };
