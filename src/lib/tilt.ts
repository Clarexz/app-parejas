/**
 * Inclinación determinista para un objeto (polaroid, post-it, ficha...).
 * Hash FNV-1a del `seed` mapeado a un entero en [-range, range] (grados). El mismo
 * `seed` da siempre el mismo ángulo; puede dar 0 (objeto derecho), eso es aceptable.
 */
export function tiltFor(seed: string, range = 3): number {
  const r = Math.max(0, Math.floor(range));
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Mezcla final para que seeds parecidos ("a1", "a2") se dispersen.
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  const n = (h >>> 0) % (2 * r + 1);
  return n - r || 0; // `|| 0` evita -0
}
