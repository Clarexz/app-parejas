import type { WidgetModel, WidgetName } from '@/lib/widgets';

export type WidgetPreviewProps = {
  name: WidgetName;
  model: WidgetModel;
  width: number;
  height: number;
};

/** Tamaño de las vistas previas (dp): una celda 1×1 de un launcher típico. */
export const PREVIEW_SIZE = { width: 84, height: 96 };

/** Fondo de pantalla simulado: los widgets no tienen fondo, así que la vista previa lleva uno fijo. */
export const WALLPAPER = '#3A3A44';
