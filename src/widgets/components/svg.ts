// SVG de fondo de los widgets: la hoja de cuaderno (cuadrícula de 14 dp), la cinta washi y el
// subrayado a mano. Cadenas puras, sin React.
import type { WidgetPalette, WidgetSize } from './palette';

const GRID = 14;
const RADIUS = 14;

export type TapeTone = 'yellow' | 'mint' | 'pink';

function tapeColor(palette: WidgetPalette, tone: TapeTone): string {
  return { yellow: palette.tapeYellow, mint: palette.tapeMint, pink: palette.tapePink }[tone];
}

/** Hoja de cuaderno con cuadrícula, margen opcional y una cinta washi pegada arriba. */
export function sheetSvg(
  palette: WidgetPalette,
  size: WidgetSize,
  opts: { tape: TapeTone; margin: boolean },
): string {
  const w = Math.round(size.width);
  const h = Math.round(size.height);
  const lines: string[] = [];
  for (let x = GRID; x < w; x += GRID) {
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}"/>`);
  }
  for (let y = GRID; y < h; y += GRID) {
    lines.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);
  }
  const marginX = GRID + 8;
  const margin = opts.margin
    ? `<line x1="${marginX}" y1="0" x2="${marginX}" y2="${h}" stroke="${palette.margin}" stroke-width="1.5"/>`
    : '';
  // Cinta inclinada −4° cerca de la esquina superior derecha, saliéndose un poco de la hoja.
  const tapeW = 46;
  const tapeH = 15;
  const tx = w - tapeW - 22;
  const tape = `<g transform="rotate(-4 ${tx + tapeW / 2} 2)"><rect x="${tx}" y="-5" width="${tapeW}" height="${tapeH}" fill="${tapeColor(palette, opts.tape)}"/></g>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs><clipPath id="c"><rect width="${w}" height="${h}" rx="${RADIUS}"/></clipPath></defs>` +
    `<g clip-path="url(#c)">` +
    `<rect width="${w}" height="${h}" fill="${palette.paper}"/>` +
    `<g stroke="${palette.grid}" stroke-width="1">${lines.join('')}</g>` +
    margin +
    tape +
    `</g>` +
    `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${RADIUS}" fill="none" stroke="${palette.ruled}" stroke-width="1"/>` +
    `</svg>`
  );
}

/** Subrayado a mano (trazo de pluma ligeramente ondulado) para el número protagonista. */
export function underlineSvg(color: string, width: number, height = 8): string {
  const w = Math.round(width);
  const mid = height / 2;
  const d = `M2 ${mid + 1} C ${w * 0.2} ${mid - 3}, ${w * 0.35} ${mid + 3}, ${w * 0.55} ${mid - 1} S ${w * 0.85} ${mid - 2}, ${w - 2} ${mid + 1}`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}">` +
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/></svg>`
  );
}
