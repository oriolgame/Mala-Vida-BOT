// Depuración: abre URLs con un navegador real y muestra enlaces y peticiones de red.
import { chromium } from 'playwright';

const urls = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  locale: 'ca-ES',
});
for (const url of urls) {
  console.log(`\n===== ${url}`);
  const page = await ctx.newPage();
  const reqs = [];
  page.on('response', async (r) => {
    const u = r.url();
    if (/\.(png|jpe?g|svg|gif|woff2?|css|ico)(\?|$)/.test(u) || /google|gstatic|doubleclick|facebook/.test(u)) return;
    let extra = '';
    if (/json/.test(r.headers()['content-type'] || '')) {
      try { extra = ' ' + (await r.text()).slice(0, 1500); } catch {}
    }
    reqs.push(`${r.status()} ${r.request().method()} ${u}${extra}`);
  });
  try {
    if (/^https?:\/\/msstats/.test(url)) {
      const r = await ctx.request.get(url);
      console.log(r.status(), (await r.text()).slice(0, 4000));
      continue;
    }
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(4000);
    console.log('título:', await page.title(), '· url final:', page.url());
    const links = await page.$$eval('a[href]', (as) => [...new Set(as.map((a) => a.href + '  «' + a.textContent.trim().replace(/\s+/g, ' ').slice(0, 50) + '»'))]);
    console.log(`enlaces (${links.length}):\n  ` + links.filter((l) => /basquetcatala|msstats/.test(l)).slice(0, 150).join('\n  '));
    console.log('texto:', (await page.innerText('body')).replace(/\s+/g, ' ').slice(0, 1500));
  } catch (e) {
    console.log('error', e.message);
  }
  console.log(`peticiones (${reqs.length}):\n  ` + reqs.slice(0, 80).join('\n  '));
  await page.close();
}
await browser.close();
