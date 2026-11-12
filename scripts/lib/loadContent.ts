// Lectura de content/ desde disco (compartida por build-seed, check-content e import-questions).
// Solo sintaxis TS borrable (Node 22 quita los tipos).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { GameFile, ImportedFile, PackFile, QuestionFile } from './seed.ts';

export interface LoadedContent {
  categoriesData: unknown;
  files: QuestionFile[];
  gameFiles: GameFile[];
  /** undefined si no existe content/packs.json. */
  packsData: unknown;
  packFiles: PackFile[];
  importedFiles: ImportedFile[];
  /** Errores de lectura (JSON inválido). */
  readErrors: string[];
}

function readJson(path: string, label: string, errors: string[]): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    errors.push(`${label}: JSON inválido (${e instanceof Error ? e.message : String(e)})`);
    return undefined;
  }
}

/** Lee los .json de una carpeta opcional (ordenados). Si no existe, lista vacía. */
function readDir(
  dir: string,
  labelPrefix: string,
  errors: string[],
): { file: string; data: unknown }[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => ({ file, data: readJson(join(dir, file), `${labelPrefix}${file}`, errors) }));
}

/** Carga todo content/ bajo `root` (la raíz del repo). */
export function loadContent(root: string): LoadedContent {
  const readErrors: string[] = [];
  const content = join(root, 'content');
  const categoriesData = readJson(join(content, 'categories.json'), 'categories.json', readErrors);
  const files = readDir(join(content, 'questions'), '', readErrors);
  const gameFiles = readDir(join(content, 'games'), 'games/', readErrors);
  const packsPath = join(content, 'packs.json');
  const packsData = existsSync(packsPath)
    ? readJson(packsPath, 'packs.json', readErrors)
    : undefined;
  const packFiles = readDir(join(content, 'packs'), 'packs/', readErrors);
  const importedFiles = readDir(join(content, 'imported'), 'imported/', readErrors);
  return { categoriesData, files, gameFiles, packsData, packFiles, importedFiles, readErrors };
}
