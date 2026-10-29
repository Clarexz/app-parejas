// QA visual: exporta la web, la sirve estática y toma capturas claro/oscuro por ruta.
// Uso: npm run shots [-- --no-build] [-- / /otra-ruta]
import { execSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const DIST = 'dist';
const OUT = 'shots';
const DEFAULT_ROUTES = ['/'];
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

const args = process.argv.slice(2);
const noBuild = args.includes('--no-build');
const routes = args
  .filter((a) => !a.startsWith('--'))
  .map((r) => (r.startsWith('/') ? r : `/${r}`));
const targets = routes.length ? routes : DEFAULT_ROUTES;

if (!noBuild || !existsSync(DIST)) {
  execSync(`npx expo export -p web --output-dir ${DIST}`, { stdio: 'inherit' });
}

const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(
    /^(\.\.[/\\])+/,
    '',
  );
  let file = join(DIST, path);
  // Fallback SPA: cualquier ruta que no sea un archivo existente devuelve index.html.
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  for (const colorScheme of ['light', 'dark']) {
    const context = await browser.newContext({
      viewport: { width: 412, height: 915 },
      deviceScaleFactor: 2,
      colorScheme,
    });
    for (const route of targets) {
      const page = await context.newPage();
      await page.goto(base + route, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      const name = route === '/' ? 'index' : route.replace(/^\//, '').replace(/\//g, '-');
      const file = `${OUT}/${name}-${colorScheme}.png`;
      await page.screenshot({ path: file });
      console.log(`captura: ${file}`);
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
