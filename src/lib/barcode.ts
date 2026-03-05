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
  const targetWidthPx = Math.max(widthMm * 3.7795, 120);
  const estimatedModules = Math.max(text.length * 11 + 35, 60);
  const scaleX = Math.max(2, Math.min(8, Math.round(targetWidthPx / estimatedModules)));

  try {
    bwipjs.toCanvas(canvas, {
      bcid: 'code128',
      text,
      scaleX,
      scaleY: 4,
      height: 20,
      includetext: false,
      textxalign: 'center',
      paddingwidth: 0,
      paddingheight: 0,
    });
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}
