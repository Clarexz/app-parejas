// Lógica pura de import-questions: parser CSV, slugs y validación de filas importadas.
// Solo sintaxis TS borrable (Node 22 quita los tipos).
import { NEAR_DUP_ERROR, NEAR_DUP_WARN, NearDupIndex } from './contentCheck.ts';
import { normalizeText, validateImportedItem } from './seed.ts';
import type { Category, ValidatedQuestion } from './seed.ts';

/** Parser CSV (RFC 4180): comillas, "" como comilla escapada, saltos de línea dentro de comillas, BOM. */
export function parseCsv(input: string, delimiter = ','): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let touched = false; // la fila actual tiene algo (aunque sea un campo vacío entre comas)
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"' && field === '') {
      quoted = true;
      touched = true;
    } else if (c === delimiter) {
      row.push(field);
      field = '';
      touched = true;
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      if (touched || field !== '') {
        row.push(field);
        rows.push(row);
      }
      row = [];
      field = '';
      touched = false;
    } else {
      field += c;
      touched = true;
    }
  }
  if (touched || field !== '') {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Slug en minúsculas, sin acentos, solo [a-z0-9-], sin guiones al borde ni repetidos. */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `<categoría>-<texto-slugificado>` de máximo 80 caracteres, sin choques con `taken`. */
export function makeSlug(
  category: string,
  text: string,
  taken: { has(slug: string): boolean },
): string {
  const prefix = `${category}-`;
  const max = 80;
  let body = slugify(text);
  if (prefix.length + body.length > max) {
    body = body.slice(0, max - prefix.length).replace(/-+$/, '');
    // Corta en el último guion para no partir palabras, si queda algo razonable.
    const cut = body.lastIndexOf('-');
    if (cut >= 12) body = body.slice(0, cut);
  }
  let slug = prefix + (body || 'pregunta');
  for (let n = 2; taken.has(slug); n++) {
    const suffix = `-${n}`;
    slug =
      (prefix + (body || 'pregunta')).slice(0, max - suffix.length).replace(/-+$/, '') + suffix;
  }
  return slug;
}

export interface RawRow {
  text: string;
  category: string;
  type: string;
  intensity: string;
  options: string[];
  /** Número de fila en el archivo de origen (1 = primera de datos). */
  line: number;
}

const ALIASES: Record<string, 'text' | 'category' | 'type' | 'intensity' | 'options'> = {
  texto: 'text',
  text: 'text',
  pregunta: 'text',
  categoria: 'category',
  category: 'category',
  tipo: 'type',
  type: 'type',
  intensidad: 'intensity',
  intensity: 'intensity',
  opciones: 'options',
  options: 'options',
};

function splitOptions(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((o) => String(o).trim()).filter((o) => o !== '');
  if (typeof v !== 'string') return [];
  return v
    .split('|')
    .map((o) => o.trim())
    .filter((o) => o !== '');
}

/** Convierte registros (CSV ya parseado o JSON) a filas con las llaves canónicas. */
export function normalizeRecords(records: Record<string, unknown>[]): RawRow[] {
  return records.map((rec, i) => {
    const row: RawRow = {
      text: '',
      category: '',
      type: 'open',
      intensity: 'ligera',
      options: [],
      line: i + 1,
    };
    for (const [k, v] of Object.entries(rec)) {
      const key = ALIASES[normalizeText(k).replace(/ /g, '')];
      if (!key) continue;
      if (key === 'options') row.options = splitOptions(v);
      else if (typeof v === 'string' || typeof v === 'number') {
        const val = String(v).trim();
        if (key === 'text') row.text = val.replace(/\s+/g, ' ');
        else if (val !== '') row[key] = val;
      }
    }
    // Tipo e intensidad se comparan en minúsculas.
    row.type = row.type.toLowerCase();
    row.intensity = row.intensity.toLowerCase();
    row.category = row.category.toLowerCase();
    return row;
  });
}

/** CSV con encabezados -> registros. Detecta `;` si el encabezado no trae comas. */
export function csvToRecords(input: string): Record<string, unknown>[] {
  const firstLine = input.replace(/^﻿/, '').split(/\r?\n/, 1)[0] ?? '';
  const delimiter = !firstLine.includes(',') && firstLine.includes(';') ? ';' : ',';
  const rows = parseCsv(input, delimiter);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const rec: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      rec[h] = cells[i] ?? '';
    });
    return rec;
  });
}

export interface ExistingContent {
  categories: ReadonlyMap<string, Category>;
  /** slug -> origen, de todo el contenido ya cargado. */
  slugs: ReadonlyMap<string, string>;
  /** texto normalizado -> origen. */
  texts: ReadonlyMap<string, string>;
  /** Todos los textos existentes (para casi-duplicados). */
  items: readonly { slug: string; text: string }[];
}

export interface Rejected {
  line: number;
  text: string;
  reasons: string[];
}

export interface ImportResult {
  questions: {
    slug: string;
    category: string;
    type: string;
    intensity: string;
    text: string;
    options?: string[];
  }[];
  rejected: Rejected[];
  /** Importadas válidas parecidas (aviso) a algo existente, sin saltarse. */
  notes: string[];
}

/** Valida las filas con las reglas de CONTENT.md; las inválidas/duplicadas/casi-duplicadas se saltan. */
export function buildImport(rows: RawRow[], existing: ExistingContent): ImportResult {
  const slugOrigin = new Map(existing.slugs);
  const textOrigin = new Map(existing.texts);
  const index = new NearDupIndex();
  for (const it of existing.items) index.add(it);

  const questions: ImportResult['questions'] = [];
  const rejected: Rejected[] = [];
  const notes: string[] = [];

  for (const row of rows) {
    const slug = makeSlug(row.category || 'x', row.text || 'pregunta', slugOrigin);
    const item: Record<string, unknown> = {
      slug,
      category: row.category,
      type: row.type,
      intensity: row.intensity,
      text: row.text,
    };
    if (row.type === 'choice' || row.options.length > 0) item.options = row.options;
    const { errors, question } = validateImportedItem(
      item,
      existing.categories,
      slugOrigin,
      textOrigin,
      'importada',
    );
    if (errors.length > 0 || !question) {
      rejected.push({
        line: row.line,
        text: row.text,
        reasons: errors.map((e) => e.replace(/^importada \[[^\]]*\]: /, '')),
      });
      continue;
    }
    const near = index.find(question.text, NEAR_DUP_WARN);
    const best = near[0];
    if (best && best.score >= NEAR_DUP_ERROR) {
      // Libera lo reclamado: la fila se salta.
      slugOrigin.delete(question.slug);
      textOrigin.delete(normalizeText(question.text));
      rejected.push({
        line: row.line,
        text: row.text,
        reasons: [`casi-duplicada (${best.score.toFixed(2)}) de ${best.slug}: "${best.text}"`],
      });
      continue;
    }
    if (best) notes.push(`fila ${row.line}: parecida (${best.score.toFixed(2)}) a ${best.slug}`);
    index.add({ slug: question.slug, text: question.text });
    questions.push(toOutput(question));
  }
  return { questions, rejected, notes };
}

function toOutput(q: ValidatedQuestion): ImportResult['questions'][number] {
  const out: ImportResult['questions'][number] = {
    slug: q.slug,
    category: q.category,
    type: q.type,
    intensity: q.intensity,
    text: q.text,
  };
  if (q.options) out.options = q.options;
  return out;
}
