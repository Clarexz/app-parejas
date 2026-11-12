// Importa preguntas desde un CSV o JSON a content/imported/<nombre>.json (ver docs/CONTENT.md §7).
//   node scripts/import-questions.ts <archivo.csv|archivo.json> [--source "texto"] [--out nombre] [--force]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { csvToRecords, buildImport, normalizeRecords, slugify } from './lib/importQuestions.ts';
import { loadContent } from './lib/loadContent.ts';
import { normalizeText, validateContent } from './lib/seed.ts';
import type { Category } from './lib/seed.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

function flag(name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
const force = args.includes('--force');
const valueFlags = new Set(['--source', '--out']);
const input = args.find((a, i) => !a.startsWith('--') && !valueFlags.has(args[i - 1] ?? ''));

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

if (!input) {
  fail(
    'Uso: node scripts/import-questions.ts <archivo.csv|archivo.json> [--source "texto"] [--out nombre] [--force]',
  );
}
if (!existsSync(input)) fail(`No existe el archivo: ${input}`);

const ext = extname(input).toLowerCase();
const raw = readFileSync(input, 'utf8');
let records: Record<string, unknown>[];
if (ext === '.json') {
  let data: unknown;
  try {
    data = JSON.parse(raw.replace(/^﻿/, ''));
  } catch (e) {
    fail(`JSON inválido: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!Array.isArray(data)) fail('El JSON debe ser un arreglo de objetos.');
  records = (data as unknown[]).map((r) =>
    typeof r === 'object' && r !== null ? (r as Record<string, unknown>) : {},
  );
} else if (ext === '.csv') {
  records = csvToRecords(raw);
} else {
  fail('Solo se aceptan archivos .csv o .json');
}

const outName = slugify(flag('--out') ?? basename(input, ext));
if (!outName) fail('El nombre de salida (--out) no tiene letras ni números.');
const outPath = join(root, 'content', 'imported', `${outName}.json`);
if (existsSync(outPath) && !force)
  fail(
    `Ya existe content/imported/${outName}.json. Usa --force para sobrescribirlo (o --out otro).`,
  );

// Contenido existente. Si se sobrescribe el mismo archivo, no cuenta contra sí mismo.
const loaded = loadContent(root);
const importedFiles = loaded.importedFiles.filter((f) => f.file !== `${outName}.json`);
const result = validateContent(loaded.categoriesData, loaded.files, loaded.gameFiles, {
  packsData: loaded.packsData,
  packFiles: loaded.packFiles,
  importedFiles,
});
if (!result.ok || loaded.readErrors.length > 0) {
  console.error('El contenido actual no es válido; corrígelo antes de importar:');
  for (const e of [...loaded.readErrors, ...(result.ok ? [] : result.errors)])
    console.error(`  - ${e}`);
  process.exit(1);
}
const { content } = result;
const categories = new Map<string, Category>(content.categories.map((c) => [c.slug, c]));
const slugs = new Map(content.questions.map((q) => [q.slug, 'content']));
const texts = new Map<string, string>();
for (const q of content.questions) texts.set(normalizeText(q.text), q.slug);

const rows = normalizeRecords(records);
const out = buildImport(rows, {
  categories,
  slugs,
  texts,
  items: content.questions.map((q) => ({ slug: q.slug, text: q.text })),
});

console.log(`Filas leídas: ${rows.length}`);
console.log(`Válidas: ${out.questions.length}`);
console.log(`Saltadas: ${out.rejected.length}`);
for (const r of out.rejected) {
  console.log(`  - fila ${r.line} "${r.text.slice(0, 60)}": ${r.reasons.join('; ')}`);
}
for (const n of out.notes) console.log(`  (aviso) ${n}`);

if (out.questions.length === 0) {
  console.log('No hay preguntas válidas: no se escribió ningún archivo.');
  process.exit(out.rejected.length > 0 ? 1 : 0);
}
const source = flag('--source') ?? basename(input);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify({ source, questions: out.questions }, null, 2)}\n`);
console.log(`Escrito content/imported/${outName}.json (${out.questions.length} preguntas)`);
console.log(
  'Revisa con `node scripts/check-content.ts` y regenera el seed con `node scripts/build-seed.ts`.',
);
