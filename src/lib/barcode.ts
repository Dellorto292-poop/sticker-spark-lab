// @ts-ignore - bwip-js types
import bwipjs from 'bwip-js';
import type { BarcodeType } from './label-types';

export async function generateBarcodeDataUrl(
  text: string,
  type: BarcodeType,
  widthMm: number
): Promise<string> {
  if (!text) return '';
  
  const canvas = document.createElement('canvas');
  
  try {
    bwipjs.toCanvas(canvas, {
      bcid: type === 'code128' ? 'code128' : 'code39',
      text: text,
      scale: 3,
      height: 10,
      width: Math.max(widthMm * 0.6, 20),
      includetext: false,
      textxalign: 'center',
    });
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}
