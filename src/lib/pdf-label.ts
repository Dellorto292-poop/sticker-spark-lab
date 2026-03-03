import { jsPDF } from 'jspdf';
import type { LabelData } from './label-types';
import { encodeBarcode, type BarcodeBars } from './barcode-encoder';

const MM_TO_PT = 72 / 25.4; // ≈ 2.8346

// ── Font loading (Cyrillic support) ──
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

/**
 * Draw a single label at (x, y) in mm coordinates on the given jsPDF instance.
 */
function drawLabel(pdf: jsPDF, x: number, y: number, data: LabelData): void {
  const { width: w, height: h } = data.size;
  const isLarge = h > 100;
  const isDesign = data.template === 'design';
  const isCompactFormat = h <= 24;

  const descRatio = isDesign ? 0 : (isLarge ? 0.25 : 0.24);
  const tableRatio = isLarge ? 0.15 : (isCompactFormat ? 0.24 : 0.18);
  const descH = h * descRatio;
  const tableH = h * tableRatio;

  // ── Border ──
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.3);
  pdf.rect(x, y, w, h);

  // ── Description area (skip for design template) ──
  if (!isDesign) {
    pdf.setLineWidth(0.3);
    pdf.line(x, y + descH, x + w, y + descH);

    // Calculate description font size (matching LabelPreview logic)
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

    pdf.setFont('JetBrainsMono', 'bold');
    pdf.setFontSize(titleFontPt);

    const text = data.itemDescription || '—';
    const lines = pdf.splitTextToSize(text, descAreaW);
    const clampedLines = lines.slice(0, maxLines);
    const lineH = titleFontMm * 1.3;
    const textBlockH = clampedLines.length * lineH;
    const textStartY = y + (descH - textBlockH) / 2 + titleFontMm;

    for (let i = 0; i < clampedLines.length; i++) {
      pdf.text(clampedLines[i], x + w / 2, textStartY + i * lineH, { align: 'center' });
    }
  }

  // ── Barcode (vector) ──
  const barcodeH = h - descH - tableH;
  const barcodeTop = y + descH;
  const bcPadY = barcodeH * 0.02;
  const bcAreaH = barcodeH - bcPadY * 2;
  const bcAreaW = w * 0.9;
  const bcX0 = x + (w - bcAreaW) / 2;

  if (data.sku) {
    const encoded = encodeBarcode(data.sku, data.barcodeType);
    drawBarcode(pdf, encoded, bcX0, barcodeTop + bcPadY, bcAreaW, bcAreaH);
  }

  // ── Table area ──
  const tableTop = y + h - tableH;
  pdf.setLineWidth(0.5);
  pdf.line(x, tableTop, x + w, tableTop);

  const baseFontMm = isLarge ? Math.max(h * 0.04, 6) : Math.max(h * 0.1, 2.2);
  const labelFontScale = isCompactFormat ? 0.4 : 0.5;
  const valueFontScale = isCompactFormat ? 0.7 : 0.85;

  const cols: { label: string; value: string }[] = [
    { label: 'SKU', value: data.sku || '—' },
    { label: 'REV.', value: data.revision || '—' },
  ];
  if (data.template === 'box') {
    const qtyLabel = data.qtyType === 'pallet' ? 'PALLET QTY' : data.qtyType === 'set' ? 'SET QTY' : 'BOX QTY';
    cols.push({ label: qtyLabel, value: String(data.boxQty ?? '—') });
  }

  const colW = w / cols.length;
  for (let i = 0; i < cols.length; i++) {
    const cx = x + i * colW + colW / 2;
    const cy = tableTop + tableH / 2;

    // Label
    pdf.setFontSize(baseFontMm * labelFontScale * MM_TO_PT);
    pdf.setFont('JetBrainsMono', 'bold');
    pdf.setTextColor(100);
    pdf.text(cols[i].label, cx, cy - tableH * 0.12, { align: 'center' });

    // Value
    pdf.setFontSize(baseFontMm * valueFontScale * MM_TO_PT);
    pdf.setTextColor(0);
    pdf.text(cols[i].value, cx, cy + tableH * 0.18, { align: 'center' });

    // Column separator
    if (i < cols.length - 1) {
      pdf.setLineWidth(0.3);
      pdf.setDrawColor(0);
      pdf.line(x + (i + 1) * colW, tableTop, x + (i + 1) * colW, y + h);
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

/**
 * Open a popup window with the label as HTML (exact mm dimensions),
 * set @page size to match, and trigger window.print().
 * Window is opened synchronously to avoid popup blocker.
 */
export async function generateThermalPdf(data: LabelData): Promise<void> {
  const { width, height } = data.size;

  // Open window IMMEDIATELY (synchronous) to avoid popup blocker
  const printWindow = window.open('', '_blank', `width=${Math.max(width * 4, 400)},height=${Math.max(height * 4, 400)}`);
  if (!printWindow) {
    await downloadVectorPdf(data);
    return;
  }

  // Generate vector PDF with exact label page size
  const pdf = new jsPDF({
    orientation: width > height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [width, height],
  });

  const fontBase64 = await loadCyrillicFont();
  registerFont(pdf, fontBase64);

  drawLabel(pdf, 0, 0, data);

  const blobUrl = pdf.output('bloburl') as unknown as string;

  // Write an HTML page that embeds the PDF and auto-prints
  printWindow.document.write(`<!DOCTYPE html><html><head><title>Label</title>
<style>*{margin:0;padding:0}html,body{width:100%;height:100%;overflow:hidden}
iframe{width:100%;height:100%;border:none}</style></head><body>
<iframe id="pf" src="${blobUrl}"></iframe>
<script>
var f=document.getElementById('pf');
f.onload=function(){
  try{f.contentWindow.print()}catch(e){window.print()}
};
</script></body></html>`);
  printWindow.document.close();
}

/**
 * Generate a vector PDF on A4 with a grid of labels.
 * Opens in a new tab for printing.
 */
export async function generateA4GridPdf(data: LabelData, config: GridConfig): Promise<void> {
  const { cols, rows, hGapMm, vGapMm, marginMm } = config;
  const { width: lw, height: lh } = data.size;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

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

/**
 * Download a vector PDF (single label on label-sized page).
 */
export async function downloadVectorPdf(data: LabelData): Promise<void> {
  const { width, height } = data.size;

  const pdf = new jsPDF({
    orientation: width > height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [width, height],
  });

  const fontBase64 = await loadCyrillicFont();
  registerFont(pdf, fontBase64);

  drawLabel(pdf, 0, 0, data);
  pdf.save(`${data.sku || 'label'}.pdf`);
}
