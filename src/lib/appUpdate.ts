/**
 * Buscador de actualizaciones (sin backend): compara la versión instalada con los releases
 * públicos de GitHub. Módulo puro: la red y la UI viven en `src/features/updates`.
 */

export const RELEASES_API = 'https://api.github.com/repos/Clarexz/app-parejas/releases?per_page=15';

/**
 * Marca para que un release NO se ofrezca dentro de la app (p. ej. un APK que necesita un deploy
 * del servidor que aún no se hace, o un spike de prueba). Va en cualquier parte de las notas.
 */
export const NO_UPDATE_MARKER = '<!-- sin-aviso -->';

export type Version = [number, number, number];

/** Asset y release tal como los devuelve la API de GitHub (solo los campos que usamos). */
export type GithubRelease = {
  tag_name: string;
  html_url: string;
  draft: boolean;
  body?: string | null;
  assets: { name: string; browser_download_url: string; size: number }[];
};

export type AvailableUpdate = {
  /** Sin la "v": "0.13.0". */
  version: string;
  apkUrl: string;
  releaseUrl: string;
  sizeBytes: number;
};

/** "v0.12.2" o "0.12.2" → [0, 12, 2]; cualquier otra cosa → null. */
export function parseVersion(raw: string | null | undefined): Version | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec((raw ?? '').trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareVersions(a: Version, b: Version): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/**
 * El release más nuevo que sea mayor que la versión instalada y traiga un APK. Se ignoran
 * borradores, tags que no son vN.N.N y los marcados con `NO_UPDATE_MARKER`. Los pre-releases sí
 * cuentan (todo v0.x lo es). Con una versión instalada inválida (desarrollo: "0.0.0" o null) no
 * se ofrece nada.
 */
export function pickUpdate(
  installed: string | null | undefined,
  releases: GithubRelease[],
): AvailableUpdate | null {
  const current = parseVersion(installed);
  if (!current || compareVersions(current, [0, 0, 0]) === 0) return null;

  let best: { version: Version; update: AvailableUpdate } | null = null;
  for (const release of releases) {
    if (release.draft || release.body?.includes(NO_UPDATE_MARKER)) continue;
    const version = parseVersion(release.tag_name);
    if (!version || compareVersions(version, current) <= 0) continue;
    const apk = release.assets.find((a) => a.name.toLowerCase().endsWith('.apk'));
    if (!apk) continue;
    if (best && compareVersions(version, best.version) <= 0) continue;
    best = {
      version,
      update: {
        version: version.join('.'),
        apkUrl: apk.browser_download_url,
        releaseUrl: release.html_url,
        sizeBytes: apk.size,
      },
    };
  }
  return best?.update ?? null;
}

/** 111445124 → "106 MB" (para avisar antes de descargar con datos). */
export function formatSize(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB`;
}

/** "Luego" esconde el aviso de esa versión por un día; una versión más nueva sale de inmediato. */
export const SNOOZE_MS = 24 * 60 * 60 * 1000;

export type Snooze = { version: string; at: number };

export function isSnoozed(snooze: Snooze | null, update: AvailableUpdate, now: number): boolean {
  return !!snooze && snooze.version === update.version && now - snooze.at < SNOOZE_MS;
}
