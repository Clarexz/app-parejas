// Valida content/ y genera supabase/seed/questions.sql (ver docs/CONTENT.md).
//   node scripts/build-seed.ts          valida y regenera el seed
//   node scripts/build-seed.ts --check  valida y falla si el seed commiteado está desactualizado
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateSeedSql, validateContent } from './lib/seed.ts';
import type { GameFile, QuestionFile } from './lib/seed.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seedPath = join(root, 'supabase', 'seed', 'questions.sql');
const check = process.argv.includes('--check');

function readJson(path: string, label: string, errors: string[]): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    errors.push(`${label}: JSON inválido (${e instanceof Error ? e.message : String(e)})`);
    return undefined;
  }
}

const readErrors: string[] = [];
const categoriesData = readJson(
  join(root, 'content', 'categories.json'),
  'categories.json',
  readErrors,
);
const questionsDir = join(root, 'content', 'questions');
const files: QuestionFile[] = readdirSync(questionsDir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((file) => ({ file, data: readJson(join(questionsDir, file), file, readErrors) }));

// content/games/ es opcional: lo que falte cuenta como lista vacía.
const gamesDir = join(root, 'content', 'games');
const gameFiles: GameFile[] = existsSync(gamesDir)
  ? readdirSync(gamesDir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .map((file) => ({ file, data: readJson(join(gamesDir, file), `games/${file}`, readErrors) }))
  : [];

const result = validateContent(categoriesData, files, gameFiles);
const errors = [...readErrors, ...(result.ok ? [] : result.errors)];
if (errors.length > 0 || !result.ok) {
  console.error(`Contenido inválido (${errors.length} errores):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log('Categoría            total  open  choice');
for (const s of result.summary) {
  console.log(
    `${s.slug.padEnd(20)} ${String(s.total).padStart(5)} ${String(s.open).padStart(5)} ${String(s.choice).padStart(7)}`,
  );
}
for (const g of result.games.filter((x) => x.game !== 'drawing')) {
  console.log(`${`juegos/${g.game}`.padEnd(20)} ${String(g.total).padStart(5)}`);
}
console.log(`Total: ${result.content.questions.length} preguntas`);
console.log(`Palabras de dibujo: ${result.content.drawingWords.length}`);

const sql = generateSeedSql(result.content, result.summary);
if (check) {
  const current = existsSync(seedPath) ? readFileSync(seedPath, 'utf8') : null;
  if (current !== sql) {
    console.error(
      'supabase/seed/questions.sql no coincide con content/: corre `node scripts/build-seed.ts` y commitea el resultado.',
    );
    process.exit(1);
  }
  console.log('Seed al día.');
} else {
  mkdirSync(dirname(seedPath), { recursive: true });
  writeFileSync(seedPath, sql);
  console.log('Escrito supabase/seed/questions.sql');
}
