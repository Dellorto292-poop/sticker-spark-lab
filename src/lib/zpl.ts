import type { LabelData } from './label-types';

export function generateZpl(data: LabelData): string {
  const dpmm = data.dpi === 203 ? 8 : 12; // dots per mm
  const widthDots = data.size.width * dpmm;
  const heightDots = data.size.height * dpmm;
  
  const barcodeCmd = data.barcodeType === 'code128' ? '^BC' : '^B3';
  
  const lines: string[] = [
    '^XA',
    `^PW${widthDots}`,
    `^LL${heightDots}`,
    // Item Description
    `^FO${Math.round(widthDots * 0.05)},${Math.round(heightDots * 0.05)}`,
    `^A0N,${Math.round(heightDots * 0.12)},${Math.round(heightDots * 0.1)}`,
    `^FD${data.itemDescription}^FS`,
    // Barcode
    `^FO${Math.round(widthDots * 0.1)},${Math.round(heightDots * 0.25)}`,
    `${barcodeCmd}N,${Math.round(heightDots * 0.25)},Y,N,N`,
    `^FD${data.sku}^FS`,
    // Table separator
    `^FO0,${Math.round(heightDots * 0.7)}`,
    `^GB${widthDots},1,1^FS`,
  ];

  // Table row
  const colWidth = data.template === 'box' ? Math.round(widthDots / 3) : Math.round(widthDots / 2);
  const tableY = Math.round(heightDots * 0.72);
  const valueY = Math.round(heightDots * 0.82);
  const fontSize = Math.round(heightDots * 0.08);

  lines.push(
    // SKU column
    `^FO${Math.round(widthDots * 0.02)},${tableY}^A0N,${fontSize},${fontSize}^FDSKU^FS`,
    `^FO${Math.round(widthDots * 0.02)},${valueY}^A0N,${Math.round(fontSize * 1.2)},${Math.round(fontSize * 1.2)}^FD${data.sku}^FS`,
    // Vertical separator
    `^FO${colWidth},${Math.round(heightDots * 0.7)}^GB1,${Math.round(heightDots * 0.28)},1^FS`,
    // Rev column
    `^FO${colWidth + Math.round(widthDots * 0.02)},${tableY}^A0N,${fontSize},${fontSize}^FDRev.^FS`,
    `^FO${colWidth + Math.round(widthDots * 0.02)},${valueY}^A0N,${Math.round(fontSize * 1.2)},${Math.round(fontSize * 1.2)}^FD${data.revision}^FS`,
  );

  if (data.template === 'box') {
    lines.push(
      `^FO${colWidth * 2},${Math.round(heightDots * 0.7)}^GB1,${Math.round(heightDots * 0.28)},1^FS`,
      `^FO${colWidth * 2 + Math.round(widthDots * 0.02)},${tableY}^A0N,${fontSize},${fontSize}^FDBox Qty^FS`,
      `^FO${colWidth * 2 + Math.round(widthDots * 0.02)},${valueY}^A0N,${Math.round(fontSize * 1.2)},${Math.round(fontSize * 1.2)}^FD${data.boxQty ?? ''}^FS`,
    );
  }

  lines.push('^XZ');
  return lines.join('\n');
}
