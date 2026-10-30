// Rasteriza las fuentes SVG de assets/brand/ a PNG en assets/images/ (npm run brand).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const SRC = 'assets/brand';
const OUT = 'assets/images';

// [svg, png, tamaño, transparente]
const JOBS = [
  ['icon.svg', 'icon.png', 1024, false],
  ['adaptive-background.svg', 'android-icon-background.png', 1024, false],
  ['adaptive-foreground.svg', 'android-icon-foreground.png', 1024, true],
  ['adaptive-monochrome.svg', 'android-icon-monochrome.png', 1024, true],
  ['splash.svg', 'splash-icon.png', 1024, true],
  ['favicon.svg', 'favicon.png', 48, false],
  ['notification-icon.svg', 'notification-icon.png', 96, true],
];

const browser = await chromium.launch();
try {
  for (const [svg, png, size, transparent] of JOBS) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    const markup = readFileSync(`${SRC}/${svg}`, 'utf8');
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${markup.replace(
        /width="\d+" height="\d+"/,
        `width="${size}" height="${size}"`,
      )}</body></html>`,
    );
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
