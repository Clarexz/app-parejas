// QA visual: exporta la web, la sirve estática y toma capturas claro/oscuro por ruta.
// Uso:
//   npm run shots [-- --no-build] [-- /ruta /otra-ruta]   rutas públicas (sin sesión)
//   npm run shots -- --scenarios [--no-build] [nombre ...] pantallas con sesión, contra un
//                                                          Supabase simulado (shots-scenarios.mjs)
import { execSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';

import {
  applyScenario,
  SCENARIOS,
  SHOTS_ANON_KEY,
  SHOTS_SUPABASE_URL,
} from './shots-scenarios.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const OUT = 'shots';
const DEFAULT_ROUTES = ['/conexion', '/catalogo'];
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
const scenariosMode = args.includes('--scenarios');
const positional = args.filter((a) => !a.startsWith('--'));

// Los escenarios usan otra exportación (con el host simulado incrustado) para no pisar `dist`.
const DIST = scenariosMode ? 'dist-scenarios' : 'dist';

if (!noBuild || !existsSync(DIST)) {
  const env = scenariosMode
    ? {
        ...process.env,
        EXPO_PUBLIC_SUPABASE_URL: SHOTS_SUPABASE_URL,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: SHOTS_ANON_KEY,
      }
    : process.env;
  execSync(`npx expo export -p web --output-dir ${DIST}`, { stdio: 'inherit', env });
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

/** Trabajos a capturar: { scenario?, scenarioName?, routes }. */
let jobs;
if (scenariosMode) {
  const names = positional.length ? positional : Object.keys(SCENARIOS);
  const unknown = names.filter((n) => !SCENARIOS[n]);
  if (unknown.length) {
    console.error(
      `Escenarios desconocidos: ${unknown.join(', ')}. Hay: ${Object.keys(SCENARIOS).join(', ')}`,
    );
    process.exit(1);
  }
  jobs = names.map((n) => ({ scenario: SCENARIOS[n], routes: SCENARIOS[n].routes }));
} else {
  const routes = positional.map((r) => (r.startsWith('/') ? r : `/${r}`));
  jobs = [{ routes: routes.length ? routes : DEFAULT_ROUTES }];
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  for (const colorScheme of ['light', 'dark']) {
    for (const job of jobs) {
      const context = await browser.newContext({
        viewport: { width: 412, height: 915 },
        deviceScaleFactor: 2,
        colorScheme,
        locale: 'es-MX',
        timezoneId: 'America/Mexico_City',
      });
      if (job.scenario) await applyScenario(context, job.scenario);
      for (const route of job.routes) {
        const page = await context.newPage();
        await page.goto(base + route, { waitUntil: 'networkidle' });
        await page.waitForTimeout(job.scenario ? 900 : 500);
        const name = route === '/' ? 'index' : route.replace(/^\//, '').replace(/\//g, '-');
        const file = `${OUT}/${name}-${colorScheme}.png`;
        // El scroll vive dentro de un ScrollView de RN-web: se mide su contenido y se agranda el
        // viewport para que la captura de página completa lo muestre entero.
        const scrollHeight = await page.evaluate(() =>
          Math.max(
            0,
            ...[...document.querySelectorAll('div')].map((el) =>
              el.scrollHeight > el.clientHeight + 1 ? el.scrollHeight : 0,
            ),
          ),
        );
        if (scrollHeight > 915) {
          await page.setViewportSize({ width: 412, height: Math.min(scrollHeight + 80, 16000) });
          await page.waitForTimeout(400);
        }
        await page.screenshot({ path: file, fullPage: true });
        console.log(`captura: ${file}`);
        await page.close();
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
