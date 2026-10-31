import * as ImageManipulator from 'expo-image-manipulator';

import { base64ToArrayBuffer } from './base64';

export type JpegResult = { data: ArrayBuffer; width: number; height: number };

/**
 * Reduce a `maxSide` px (solo se reduce, nunca se agranda) y guarda JPEG con la calidad dada;
 * devuelve el contenido listo para subir y las dimensiones finales.
 */
export async function toJpeg(
  localUri: string,
  maxSide: number,
  quality: number,
): Promise<JpegResult> {
  const original = await ImageManipulator.ImageManipulator.manipulate(localUri).renderAsync();
  const context = ImageManipulator.ImageManipulator.manipulate(localUri);
  if (Math.max(original.width, original.height) > maxSide) {
    context.resize(original.width >= original.height ? { width: maxSide } : { height: maxSide });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({
    compress: quality,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  if (!result.base64) throw new Error('No se pudo procesar la foto.');
  return { data: base64ToArrayBuffer(result.base64), width: result.width, height: result.height };
}
