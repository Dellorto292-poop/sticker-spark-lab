export type TemplateType = 'unit' | 'box';
export type BarcodeType = 'code128' | 'code39';
export type QtyType = 'box' | 'pallet' | 'set';
export type DPI = 203 | 300;

export interface LabelSize {
  name: string;
  width: number; // mm
  height: number; // mm
}

export const SIZE_PRESETS: LabelSize[] = [
  { name: '58×40 мм', width: 58, height: 40 },
];

export const SIZE_PRESETS_BOX: LabelSize[] = [
  { name: '58×40 мм', width: 58, height: 40 },
  { name: 'A4', width: 190, height: 277 },
];

export const DEFAULT_SKU_REGEX = '^[A-Z0-9]+$';

export interface LabelData {
  id: string;
  template: TemplateType;
  itemDescription: string;
  sku: string;
  revision: string;
  boxQty?: number;
  qtyType?: QtyType;
  barcodeType: BarcodeType;
  size: { width: number; height: number };
  dpi: DPI;
  createdAt: number;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
