/**
 * Llave de caché estable para fotos remotas. Las URLs firmadas de Storage cambian de token en cada
 * petición (`.../object/sign/<bucket>/<ruta>?token=...`); la ruta del archivo no. Usarla como
 * `cacheKey` de expo-image evita descargar otra vez la misma foto.
 */
export function imageCacheKey(uri: string | null | undefined): string | undefined {
  if (!uri) return undefined;
  const match = /\/object\/(?:sign|authenticated|public)\/([^?#]+)/.exec(uri);
  return match ? `storage:${match[1]}` : undefined;
}

/** `source` de expo-image con `cacheKey` estable (sin cambios para URIs locales o `data:`). */
export function remoteImageSource(uri: string): { uri: string; cacheKey?: string } {
  const cacheKey = imageCacheKey(uri);
  return cacheKey ? { uri, cacheKey } : { uri };
}
