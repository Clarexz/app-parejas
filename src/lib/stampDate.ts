import { parseIsoDate } from './dates';

const DAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

/** Fecha para sello de fechador en es-MX: "JUE 29 OCT 2026" (hora local). */
export function formatStampDate(date: Date): string {
  return `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Igual que `formatStampDate` para una fecha 'YYYY-MM-DD', sin depender de la zona del dispositivo. */
export function formatStampIsoDate(iso: string): string {
  const p = parseIsoDate(iso);
  if (!p) return '';
  const d = new Date(0);
  d.setUTCFullYear(p.year, p.month - 1, p.day);
  return `${DAYS[d.getUTCDay()]} ${p.day} ${MONTHS[p.month - 1]} ${p.year}`;
}
