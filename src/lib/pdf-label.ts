import { jsPDF } from 'jspdf';
import type { LabelData } from './label-types';
import { encodeBarcode, type BarcodeBars } from './barcode-encoder';

const MM_TO_PT = 72 / 25.4;

let fontBase64Cache: string | null = null;

async function loadCyrillicFont(): Promise<string> {
  if (fontBase64Cache) return fontBase64Cache;
  const res = await fetch('/fonts/JetBrainsMono-Bold.ttf');
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  fontBase64Cache = btoa(binary);
  return fontBase64Cache;
}

function registerFont(pdf: jsPDF, fontBase64: string): void {
  pdf.addFileToVFS('JetBrainsMono-Bold.ttf', fontBase64);
  pdf.addFont('JetBrainsMono-Bold.ttf', 'JetBrainsMono', 'bold');
}

export interface GridConfig {
  cols: number;
  rows: number;
  hGapMm: number;
  vGapMm: number;
  marginMm: number;
}

export function defaultGridConfig(labelW: number, labelH: number): GridConfig {
  const margin = 10;
  const hGap = 2;
  const vGap = 2;
  const cols = Math.max(1, Math.floor((210 - 2 * margin + hGap) / (labelW + hGap)));
  const rows = Math.max(1, Math.floor((297 - 2 * margin + vGap) / (labelH + vGap)));
  return { cols, rows, hGapMm: hGap, vGapMm: vGap, marginMm: margin };
}

function drawLabel(pdf: jsPDF, x: number, y: number, data: LabelData): void {
  const { width: w, height: h } = data.size;
  const isLarge = h > 100;
  const isDesign = data.template === 'design';
  const isCompactFormat = h <= 24;
  const isBox = data.template === 'box';

  const descRatio = isDesign ? 0 : (isLarge ? 0.25 : 0.24);
  const infoRatio = isBox
    ? (isLarge ? 0.30 : (isCompactFormat ? 0.28 : 0.30))
    : (isLarge ? 0.13 : (isCompactFormat ? 0.20 : 0.16));
  const descH = h * descRatio;
  const infoH = h * infoRatio;

  // ── Description (top) ──
  if (!isDesign) {
    const descLen = Math.max((data.itemDescription || '—').length, 1);
    const descAreaW = w * 0.92;
    const minFont = isLarge ? 3.0 : 1.0;
    const idealFontH = h * (isLarge ? 0.03 : 0.08);
    const idealLines = Math.ceil(descH / (idealFontH * 1.3));
    const neededLines = Math.ceil((descLen * idealFontH * 0.6) / descAreaW);
    const maxLines = Math.max(2, Math.min(Math.max(idealLines, neededLines), isLarge ? 4 : 6));
    const maxFontH = descH / (maxLines * 1.3);
    const charsPerLine = Math.max(1, Math.ceil(descLen / maxLines));
    const maxFontW = descAreaW / (charsPerLine * 0.6);
    const titleFontMm = Math.max(minFont, Math.min(maxFontH, maxFontW, h * (isLarge ? 0.04 : 0.1)));
    const titleFontPt = titleFontMm * MM_TO_PT;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(titleFontPt);

    const descTop = y;
    const text = data.itemDescription || '—';
    const lines = pdf.splitTextToSize(text, descAreaW);
    const clampedLines = lines.slice(0, maxLines);
    const lineH = titleFontMm * 1.3;
    const textBlockH = clampedLines.length * lineH;
    const textStartY = descTop + (descH - textBlockH) / 2 + titleFontMm;

    for (let i = 0; i < clampedLines.length; i++) {
      pdf.text(clampedLines[i], x + w / 2, textStartY + i * lineH, { align: 'center' });
    }
  }

  // ── Barcode (middle, 80% width) ──
  const barcodeAreaH = h - descH - infoH;
  const barcodeTop = y + descH;
  const bcPadV = 2;
  const bcPadH = w * 0.1;
  const bcAreaH = barcodeAreaH - bcPadV * 2;
  const bcAreaW = w - bcPadH * 2;
  const bcX0 = x + bcPadH;

  if (data.sku) {
    const encoded = encodeBarcode(data.sku, data.barcodeType);
    drawBarcode(pdf, encoded, bcX0, barcodeTop + bcPadV, bcAreaW, bcAreaH);
  }

  // ── Info row (bottom) ──
  const infoTop = y + h - infoH;
  const baseFontMm = isLarge ? Math.max(h * 0.04, 6) : Math.max(h * 0.1, 2.2);
  const labelFontScale = isCompactFormat ? 0.4 : 0.5;
  const valueFontScale = isCompactFormat ? 0.7 : 0.85;

  if (isBox) {
    const qtyLabel = data.qtyType === 'pallet' ? 'PALLET QTY' : data.qtyType === 'set' ? 'SET QTY' : 'BOX QTY';
    const colW = w / 3;

    // SKU column
    const skuCx = x + colW * 0.5;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(baseFontMm * labelFontScale * MM_TO_PT);
    pdf.setTextColor(0);
    pdf.text('SKU', skuCx, infoTop + infoH * 0.2, { align: 'center' });
    pdf.setFontSize(baseFontMm * valueFontScale * MM_TO_PT);
    pdf.text(data.sku || '—', skuCx, infoTop + infoH * 0.45, { align: 'center' });

    // REV column — text + barcode
    const revCx = x + colW * 1.5;
    pdf.setFontSize(baseFontMm * labelFontScale * MM_TO_PT);
    pdf.text('REV.', revCx, infoTop + infoH * 0.2, { align: 'center' });
    pdf.setFontSize(baseFontMm * valueFontScale * MM_TO_PT);
    pdf.text(data.revision || '—', revCx, infoTop + infoH * 0.45, { align: 'center' });

    // Revision barcode under REV value
    if (data.revision) {
      const revBcW = colW * 0.7;
      const revBcH = infoH * 0.35;
      const revBcX = revCx - revBcW / 2;
      const revBcY = infoTop + infoH * 0.55;
      const revEncoded = encodeBarcode(data.revision, data.barcodeType);
      drawBarcode(pdf, revEncoded, revBcX, revBcY, revBcW, revBcH);
    }

    // QTY column
    const qtyCx = x + colW * 2.5;
    pdf.setFontSize(baseFontMm * labelFontScale * MM_TO_PT);
    pdf.text(qtyLabel, qtyCx, infoTop + infoH * 0.2, { align: 'center' });
    pdf.setFontSize(baseFontMm * valueFontScale * MM_TO_PT);
    pdf.text(String(data.boxQty ?? '—'), qtyCx, infoTop + infoH * 0.45, { align: 'center' });
  } else {
    const cols: { label: string; value: string }[] = [
      { label: 'SKU', value: data.sku || '—' },
      { label: 'REV.', value: data.revision || '—' },
    ];

    const colW = w / cols.length;
    for (let i = 0; i < cols.length; i++) {
      const cx = x + i * colW + colW / 2;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(baseFontMm * labelFontScale * MM_TO_PT);
      pdf.setTextColor(0);
      pdf.text(cols[i].label, cx, infoTop + infoH * 0.35, { align: 'center' });
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(baseFontMm * valueFontScale * MM_TO_PT);
      pdf.setTextColor(0);
      pdf.text(cols[i].value, cx, infoTop + infoH * 0.78, { align: 'center' });
    }
  }

  pdf.setTextColor(0);
}

function drawBarcode(pdf: jsPDF, encoded: BarcodeBars, x: number, y: number, areaW: number, areaH: number): void {
  if (encoded.bars.length === 0 || encoded.totalWidth === 0) return;
  const scale = areaW / encoded.totalWidth;
  pdf.setFillColor('#000000');
  for (const bar of encoded.bars) {
    const bx = x + bar.x * scale;
    const bw = bar.w * scale;
    pdf.rect(bx, y, bw, areaH, 'F');
  }
}

export async function generateThermalPdf(data: LabelData): Promise<void> {
  const { width, height } = data.size;
  const printWindow = window.open('', '_blank', `width=${Math.max(width * 4, 400)},height=${Math.max(height * 4, 400)}`);
  if (!printWindow) { await downloadVectorPdf(data); return; }

  const pdf = new jsPDF({ orientation: width > height ? 'landscape' : 'portrait', unit: 'mm', format: [width, height] });
  const fontBase64 = await loadCyrillicFont();
  registerFont(pdf, fontBase64);
  drawLabel(pdf, 0, 0, data);

  const blobUrl = pdf.output('bloburl') as unknown as string;
  if (typeof blobUrl !== 'string' || !blobUrl.startsWith('blob:')) { printWindow.close(); throw new Error('Invalid PDF blob URL'); }

  const doc = printWindow.document;
  doc.open();
  doc.write('<!DOCTYPE html><html><head><title>Label</title></head><body></body></html>');
  doc.close();
  const style = doc.createElement('style');
  style.textContent = '*{margin:0;padding:0}html,body{width:100%;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:none}';
  doc.head.appendChild(style);
  const iframe = doc.createElement('iframe');
  iframe.setAttribute('id', 'pf');
  iframe.src = blobUrl;
  iframe.onload = () => { try { iframe.contentWindow?.print(); } catch { printWindow.print(); } };
  doc.body.appendChild(iframe);
}

export async function generateA4GridPdf(data: LabelData, config: GridConfig): Promise<void> {
  const { cols, rows, hGapMm, vGapMm, marginMm } = config;
  const { width: lw, height: lh } = data.size;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const fontBase64 = await loadCyrillicFont();
  registerFont(pdf, fontBase64);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const lx = marginMm + col * (lw + hGapMm);
      const ly = marginMm + row * (lh + vGapMm);
      if (lx + lw > 210 - marginMm + 0.5 || ly + lh > 297 - marginMm + 0.5) continue;
      drawLabel(pdf, lx, ly, data);
    }
  }
  pdf.save(`${data.sku || 'label'}-a4-grid.pdf`);
}

export async function downloadVectorPdf(data: LabelData): Promise<void> {
  const { width, height } = data.size;
  const pdf = new jsPDF({ orientation: width > height ? 'landscape' : 'portrait', unit: 'mm', format: [width, height] });
  const fontBase64 = await loadCyrillicFont();
  registerFont(pdf, fontBase64);
  drawLabel(pdf, 0, 0, data);
  pdf.save(`${data.sku || 'label'}.pdf`);
}