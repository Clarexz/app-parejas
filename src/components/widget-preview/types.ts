import type { WidgetModel, WidgetName } from '@/lib/widgets';

export type WidgetPreviewProps = {
  name: WidgetName;
  model: WidgetModel;
  width: number;
  height: number;
};

/** Tamaños de las vistas previas (dp): mediano ≈ 4×2. */
export const PREVIEW_SIZE = { width: 296, height: 120 };
