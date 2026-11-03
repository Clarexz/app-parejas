// Rasteriza las fuentes SVG de assets/brand/ a PNG en assets/images/ (npm run brand).
// El wordmark usa Bricolage Grotesque 800: se inyecta desde docs/rebranding para no depender de
// fuentes del sistema.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const SRC = 'assets/brand';
const OUT = 'assets/images';
const FONT = 'docs/rebranding/noviecitos-brand/fonts/BricolageGrotesque-normal-800.woff2';

// [svg, png, tamaño, transparente]
const JOBS = [
  ['icon.svg', 'icon.png', 1024, false],
  ['icon.svg', 'favicon.png', 48, false],
  ['adaptive-foreground.svg', 'android-icon-foreground.png', 1024, true],
  ['adaptive-background.svg', 'android-icon-background.png', 1024, false],
  ['adaptive-monochrome.svg', 'android-icon-monochrome.png', 1024, true],
  ['splash.svg', 'splash-icon.png', 1024, true],
  ['splash-dark.svg', 'splash-icon-dark.png', 1024, true],
  ['notification-icon.svg', 'notification-icon.png', 96, true],
];

const fontB64 = readFileSync(FONT).toString('base64');
const fontFace = `<style>@font-face{font-family:'Bricolage Grotesque';font-weight:800;src:url(data:font/woff2;base64,${fontB64}) format('woff2')}</style>`;

const browser = await chromium.launch();
try {
  for (const [svg, png, size, transparent] of JOBS) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    const markup = readFileSync(`${SRC}/${svg}`, 'utf8');
    await page.setContent(
      `<html><head>${fontFace}</head><body style="margin:0;background:transparent">${markup.replace(
        /width="\d+" height="\d+"/,
        `width="${size}" height="${size}"`,
      )}</body></html>`,
    );
    await page.evaluate(() => document.fonts.load("800 100px 'Bricolage Grotesque'"));
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `${OUT}/${png}`,
      omitBackground: transparent,
      clip: { x: 0, y: 0, width: size, height: size },
    });
    await page.close();
    console.log(`${SRC}/${svg} -> ${OUT}/${png} (${size}px)`);
  }
} finally {
  await browser.close();
}
