// Revisa la calidad del contenido (ver docs/CONTENT.md §6):
//   node scripts/check-content.ts            esquema + casi-duplicados + estilo; reporte contra la taxonomía
//   node scripts/check-content.ts --strict   además falla si no se cumplen los mínimos de taxonomy.json
// Sale con código 1 si hay errores (esquema, casi-duplicados >= umbral de error, estilo).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  NEAR_DUP_ERROR,
  NEAR_DUP_WARN,
  buildReport,
  checkStyle,
  findNearDuplicates,
  parseAllowlist,
} from './lib/contentCheck.ts';
import type { Taxonomy, TargetRow } from './lib/contentCheck.ts';
import { loadContent } from './lib/loadContent.ts';
import { validateContent } from './lib/seed.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');
const started = Date.now();

function readOptional(name: string, errors: string[]): unknown {
  const path = join(root, 'content', name);
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    errors.push(`${name}: JSON inválido (${e instanceof Error ? e.message : String(e)})`);
    return undefined;
  }
}

const errors: string[] = [];
const warnings: string[] = [];

// 1. Esquema (el mismo que build-seed).
const loaded = loadContent(root);
const result = validateContent(loaded.categoriesData, loaded.files, loaded.gameFiles, {
  packsData: loaded.packsData,
  packFiles: loaded.packFiles,
  importedFiles: loaded.importedFiles,
});
errors.push(...loaded.readErrors);
if (!result.ok) errors.push(...result.errors);
if (errors.length > 0 || !result.ok) {
  console.error(`Contenido inválido (${errors.length} errores):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
const content = result.content;
const textOf = new Map(content.questions.map((q) => [q.slug, q.text]));

// 2. Casi-duplicados.
const allow = parseAllowlist(readOptional('near-duplicates-ok.json', errors));
errors.push(...allow.errors);
const dups = findNearDuplicates(
  content.questions.map((q) => ({ slug: q.slug, text: q.text })),
  allow.keys,
);
for (const d of dups) {
  const msg =
    `casi-duplicado (${d.score.toFixed(2)}): ${d.a.slug} ~ ${d.b.slug}\n` +
    `      "${textOf.get(d.a.slug) ?? d.a.text}"\n      "${textOf.get(d.b.slug) ?? d.b.text}"`;
  (d.level === 'error' ? errors : warnings).push(msg);
}

// 3. Ortografía y estilo.
const style = checkStyle(content.questions);
for (const f of style) {
  const msg = `${f.slug}: ${f.message}\n      "${textOf.get(f.slug) ?? ''}"`;
  (f.level === 'error' ? errors : warnings).push(msg);
}

// 4. Reporte contra la taxonomía.
const taxonomy = (readOptional('taxonomy.json', errors) ?? {}) as Taxonomy;
const report = buildReport(content, taxonomy);

function printRows(title: string, rows: TargetRow[], groupLabel: string): void {
  if (rows.length === 0) return;
  console.log(`\n${title}`);
  console.log(
    `${groupLabel.padEnd(22)} ${'intens.'.padEnd(9)} ${'tipo'.padEnd(7)} ${'meta'.padStart(5)} ${'actual'.padStart(7)} ${'faltan'.padStart(7)}`,
  );
  let lastGroup = '';
  for (const r of rows) {
    const g = r.group === lastGroup ? '' : r.group;
    lastGroup = r.group;
    console.log(
      `${g.padEnd(22)} ${r.intensity.padEnd(9)} ${r.kind.padEnd(7)} ${String(r.target).padStart(5)} ${String(r.actual).padStart(7)} ${String(r.missing).padStart(7)}`,
    );
  }
  const target = rows.reduce((n, r) => n + r.target, 0);
  const actual = rows.reduce((n, r) => n + Math.min(r.actual, r.target), 0);
  console.log(`  cobertura de metas: ${actual}/${target}`);
}

printRows('Preguntas diarias (categoría x intensidad x tipo)', report.daily, 'categoría');
printRows('Juegos (juego x intensidad)', report.games, 'juego');
printRows('Packs', report.packs, 'pack');
for (const p of result.packs) {
  if (!report.packs.some((r) => r.group === p.slug))
    console.log(`  (el pack ${p.slug} no tiene meta en taxonomy.json)`);
}
if (result.imported.length > 0) {
  console.log('\nImportadas');
  for (const i of result.imported)
    console.log(
      `  ${i.file.padEnd(30)} ${String(i.total).padStart(5)}  fuente: ${i.source || '-'}`,
    );
}
const t = report.totals;
console.log('\nTotales');
console.log(`  diarias : ${t.daily} (mínimo ${t.minDaily})`);
console.log(`  juegos  : ${t.games} (mínimo ${t.minGames})`);
console.log(`  packs   : ${t.packs}`);
console.log(`  total   : ${t.total} (mínimo ${t.minTotal})`);
console.log(
  `  dibujo  : ${report.drawingWords.actual} palabras (meta ${report.drawingWords.target})`,
);

const sections: [string, string[]][] = [
  [`Avisos (${warnings.length})`, warnings],
  [`ERRORES (${errors.length})`, errors],
];
for (const [title, list] of sections) {
  if (list.length === 0) continue;
  console.log(`\n${title}`);
  for (const m of list) console.log(`  - ${m}`);
}
console.log(
  `\nUmbrales de casi-duplicados: error >= ${NEAR_DUP_ERROR}, aviso >= ${NEAR_DUP_WARN} (${((Date.now() - started) / 1000).toFixed(1)} s)`,
);

if (strict && report.strictFailures.length > 0) {
  console.log('\n--strict: no se cumplen los mínimos:');
  for (const f of report.strictFailures) console.log(`  - ${f}`);
  process.exit(1);
}
if (errors.length > 0) {
  console.log('\nFALLÓ: corrige los errores de arriba.');
  process.exit(1);
}
console.log('\nOK');
