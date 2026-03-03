import type { LabelData } from './label-types';
import { generateBarcodeDataUrl } from './barcode';

/**
 * Opens a popup window with the label rendered at exact mm dimensions,
 * sets @page size to match, and triggers window.print().
 * This ensures Zebra (and other label printers) get pixel-perfect output.
 */
export async function printLabel(data: LabelData): Promise<void> {
  const { width, height } = data.size;
  const isLargeFormat = height > 100;

  // Generate barcode as data URL
  let barcodeDataUrl = '';
  if (data.sku) {
    barcodeDataUrl = await generateBarcodeDataUrl(data.sku, data.barcodeType, width);
  }

  // Ratios (must match LabelPreview)
  const isBoxTemplate = data.template === 'box';
  const descAreaRatio = isLargeFormat ? 0.25 : 0.24;
  const tableAreaRatio = isBoxTemplate
    ? (isLargeFormat ? 0.15 : 0.18)
    : (isLargeFormat ? 0.10 : 0.12);
  const fontSize = isLargeFormat ? Math.max(height * 0.04, 6) : Math.max(height * 0.08, 2);

  // Title font sizing (simplified version of LabelPreview logic)
  const descLen = Math.max(data.itemDescription.length, 1);
  const descAreaH = height * descAreaRatio;
  const descAreaW = width * 0.92;
  const minFontSize = isLargeFormat ? 3.0 : 1.0;
  const idealFontH = height * (isLargeFormat ? 0.03 : 0.08);
  const idealLines = Math.ceil(descAreaH / (idealFontH * 1.3));
  const neededLines = Math.ceil((descLen * idealFontH * 0.6) / descAreaW);
  const descMaxLines = Math.max(2, Math.min(Math.max(idealLines, neededLines), isLargeFormat ? 4 : 6));
  const maxFontByHeight = descAreaH / (descMaxLines * 1.3);
  const charsPerLine = Math.max(1, Math.ceil(descLen / descMaxLines));
  const maxFontByWidth = descAreaW / (charsPerLine * 0.6);
  const titleFontSize = Math.max(minFontSize, Math.min(maxFontByHeight, maxFontByWidth, height * (isLargeFormat ? 0.04 : 0.1)));

  // Qty label
  const qtyLabel = data.qtyType === 'pallet' ? 'PALLET QTY' : data.qtyType === 'set' ? 'SET QTY' : 'BOX QTY';

  // Build table columns
  let colsHtml: string;
  if (isBoxTemplate) {
    const cols = [
      { label: 'SKU', value: data.sku || '—' },
      { label: 'REV.', value: data.revision || '—' },
      { label: qtyLabel, value: String(data.boxQty ?? '—') },
    ];
    colsHtml = cols.map((col, i) => `
      <div style="
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        ${i < cols.length - 1 ? 'border-right: 0.3mm solid #000;' : ''}
      ">
        <div style="font-size: ${fontSize * 0.5}mm; font-weight: bold; opacity: 0.7; text-transform: uppercase; white-space: nowrap;">${col.label}</div>
        <div style="font-size: ${fontSize * 0.85}mm; font-weight: bold;">${col.value}</div>
      </div>
    `).join('');
  } else {
    // Horizontal compact: "SKU value | Rev. value"
    colsHtml = `
      <div style="flex:1; display:flex; align-items:center; justify-content:center; gap:2%; padding:0 3%; border-right:0.3mm solid #000;">
        <div style="font-size:${fontSize * 0.5}mm; font-weight:bold; opacity:0.7; text-transform:uppercase; white-space:nowrap;">SKU</div>
        <div style="font-size:${fontSize * 0.85}mm; font-weight:bold;">${escapeHtml(data.sku || '—')}</div>
      </div>
      <div style="flex:1; display:flex; align-items:center; justify-content:center; gap:2%; padding:0 3%;">
        <div style="font-size:${fontSize * 0.5}mm; font-weight:bold; opacity:0.7; text-transform:uppercase; white-space:nowrap;">Rev.</div>
        <div style="font-size:${fontSize * 0.85}mm; font-weight:bold;">${escapeHtml(data.revision || '—')}</div>
      </div>
    `;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Label Print</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
    
    @page {
      size: ${width}mm ${height}mm;
      margin: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html, body {
      width: ${width}mm;
      height: ${height}mm;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      color: #000;
      background: #fff;
    }
    
    .label {
      position: relative;
      width: ${width}mm;
      height: ${height}mm;
      border: 0.3mm solid #000;
      overflow: hidden;
    }
    
    .desc {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: ${descAreaH}mm;
      padding: 2% 4%;
      font-size: ${titleFontSize}mm;
      font-weight: bold;
      line-height: 1.2;
      text-align: center;
      overflow: hidden;
      border-bottom: 0.3mm solid #000;
      display: -webkit-box;
      -webkit-line-clamp: ${descMaxLines};
      -webkit-box-orient: vertical;
      overflow-wrap: break-word;
    }
    
    .barcode {
      position: absolute;
      top: ${descAreaH}mm;
      bottom: ${height * tableAreaRatio}mm;
      left: 0; right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1mm 2mm;
    }
    
    .barcode img {
      width: 100%;
      height: 100%;
      object-fit: ${isLargeFormat ? 'contain' : 'fill'};
    }
    
    .table {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: ${height * tableAreaRatio}mm;
      border-top: 0.5mm solid #000;
      display: flex;
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="desc">${escapeHtml(data.itemDescription || '—')}</div>
    <div class="barcode">
      ${barcodeDataUrl ? `<img src="${barcodeDataUrl}" alt="barcode">` : '<div>[barcode]</div>'}
    </div>
    <div class="table">
      ${colsHtml}
    </div>
  </div>
  <script>
    // Wait for fonts and barcode image to load, then print
    Promise.all([
      document.fonts.ready,
      ...Array.from(document.images).map(img => 
        img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })
      )
    ]).then(() => {
      setTimeout(() => {
        window.print();
        window.close();
      }, 200);
    });
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', `width=${Math.max(width * 4, 400)},height=${Math.max(height * 4, 400)}`);
  if (!printWindow) {
    console.error('Popup blocked — please allow popups for printing');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
