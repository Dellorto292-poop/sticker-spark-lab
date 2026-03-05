import type { LabelData } from './label-types';
import { generateBarcodeDataUrl } from './barcode';

export async function printLabel(data: LabelData): Promise<void> {
  const { width, height } = data.size;
  const isLargeFormat = height > 100;

  let barcodeDataUrl = '';
  if (data.sku) {
    barcodeDataUrl = await generateBarcodeDataUrl(data.sku, data.barcodeType, width);
  }

  // Generate revision barcode for box template
  let revBarcodeDataUrl = '';
  if (data.template === 'box' && data.revision) {
    revBarcodeDataUrl = await generateBarcodeDataUrl(data.revision, data.barcodeType, width * 0.7);
  }

  const isBoxTemplate = data.template === 'box';
  const isDesign = data.template === 'design';
  const isCompactFormat = height <= 24;

  const descAreaRatio = isDesign ? 0 : (isLargeFormat ? 0.25 : 0.24);
  const infoAreaRatio = isBoxTemplate
    ? (isLargeFormat ? 0.40 : (isCompactFormat ? 0.38 : 0.40))
    : (isLargeFormat ? 0.13 : (isCompactFormat ? 0.20 : 0.16));

  const fontSize = isLargeFormat ? Math.max(height * 0.04, 6) : Math.max(height * 0.08, 2);
  const descAreaH = height * descAreaRatio;
  const descAreaW = width * 0.92;
  const descLen = Math.max(data.itemDescription.length, 1);
  const minFontSize = isLargeFormat ? 3.0 : 1.0;
  const idealFontH = height * (isLargeFormat ? 0.03 : 0.08);
  const idealLines = Math.ceil(descAreaH / (idealFontH * 1.3));
  const neededLines = Math.ceil((descLen * idealFontH * 0.6) / descAreaW);
  const descMaxLines = Math.max(2, Math.min(Math.max(idealLines, neededLines), isLargeFormat ? 4 : 6));
  const maxFontByHeight = descAreaH / (descMaxLines * 1.3);
  const charsPerLine = Math.max(1, Math.ceil(descLen / descMaxLines));
  const maxFontByWidth = descAreaW / (charsPerLine * 0.6);
  const titleFontSize = Math.max(minFontSize, Math.min(maxFontByHeight, maxFontByWidth, height * (isLargeFormat ? 0.04 : 0.1)));

  const qtyLabel = data.qtyType === 'pallet' ? 'PALLET QTY' : data.qtyType === 'set' ? 'SET QTY' : 'BOX QTY';
  const infoH = height * infoAreaRatio;

  let infoHtml: string;
  if (isBoxTemplate) {
    infoHtml = `
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; padding-top:1.5mm;">
        <div style="font-size:${fontSize * 0.5}mm; font-weight:600; text-transform:uppercase; white-space:nowrap;">SKU</div>
        <div style="font-size:${fontSize * 0.85}mm; font-weight:bold; margin-top:0.5mm;">${escapeHtml(data.sku || '—')}</div>
      </div>
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; padding-top:1.5mm; padding-bottom:0.5mm; gap:0.5mm;">
        <div style="font-size:${fontSize * 0.5}mm; font-weight:600; text-transform:uppercase; white-space:nowrap;">REV.</div>
        <div style="font-size:${fontSize * 0.85}mm; font-weight:bold;">${escapeHtml(data.revision || '—')}</div>
        ${revBarcodeDataUrl ? `<img src="${revBarcodeDataUrl}" style="width:95%; height:${infoH * 0.46}mm; object-fit:contain;" alt="rev barcode">` : ''}
      </div>
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; padding-top:1.5mm;">
        <div style="font-size:${fontSize * 0.5}mm; font-weight:600; text-transform:uppercase; white-space:nowrap;">${qtyLabel}</div>
        <div style="font-size:${fontSize * 0.85}mm; font-weight:bold; margin-top:0.5mm;">${String(data.boxQty ?? '—')}</div>
      </div>
    `;
  } else {
    infoHtml = `
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;">
        <div style="font-size:${fontSize * 0.5}mm; font-weight:600; text-transform:uppercase; white-space:nowrap;">SKU</div>
        <div style="font-size:${fontSize * 0.85}mm; font-weight:bold;">${escapeHtml(data.sku || '—')}</div>
      </div>
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;">
        <div style="font-size:${fontSize * 0.5}mm; font-weight:600; text-transform:uppercase; white-space:nowrap;">Rev.</div>
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
    @font-face {
      font-family: 'LabelFont';
      src: url('/fonts/JetBrainsMono-Bold.ttf') format('truetype');
      font-weight: bold;
      font-style: normal;
    }
    @page { size: ${width}mm ${height}mm; margin: 0; }
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:${width}mm; height:${height}mm; margin:0; padding:0; }
    body { font-family:'LabelFont','Helvetica Neue',Helvetica,Arial,sans-serif; color:#000; background:#fff; }
    .label { position:relative; width:${width}mm; height:${height}mm; overflow:hidden; }
    .desc { position:absolute; top:0; left:0; right:0; height:${descAreaH}mm; padding:2% 4%; font-size:${titleFontSize}mm; font-weight:bold; line-height:1.2; text-align:center; overflow:hidden; display:-webkit-box; -webkit-line-clamp:${descMaxLines}; -webkit-box-orient:vertical; overflow-wrap:break-word; }
    .barcode { position:absolute; top:${descAreaH}mm; bottom:${infoH}mm; left:0; right:0; display:flex; align-items:center; justify-content:center; padding:2mm 1mm; }
    .info { position:absolute; bottom:0; left:0; right:0; height:${infoH}mm; display:flex; }
    .barcode img { width:${isBoxTemplate ? '70%' : '80%'}; height:100%; object-fit:${isLargeFormat ? 'contain' : 'fill'}; }
  </style>
</head>
<body>
  <div class="label">
    ${!isDesign ? `<div class="desc">${escapeHtml(data.itemDescription || '—')}</div>` : ''}
    <div class="barcode">
      ${barcodeDataUrl ? `<img src="${barcodeDataUrl}" alt="barcode">` : '<div>[barcode]</div>'}
    </div>
    <div class="info">${infoHtml}</div>
  </div>
  <script>
    Promise.all([document.fonts.ready,...Array.from(document.images).map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=r;img.onerror=r;}))]).then(()=>{setTimeout(()=>{window.print();window.close();},200);});
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', `width=${Math.max(width * 4, 400)},height=${Math.max(height * 4, 400)}`);
  if (!printWindow) { console.error('Popup blocked'); return; }
  printWindow.document.write(html);
  printWindow.document.close();
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}