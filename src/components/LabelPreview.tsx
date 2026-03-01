import { useEffect, useState, forwardRef } from 'react';
import { generateBarcodeDataUrl } from '@/lib/barcode';
import type { LabelData } from '@/lib/label-types';

interface Props {
  data: LabelData;
}

const LabelPreview = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const [barcodeUrl, setBarcodeUrl] = useState('');

  useEffect(() => {
    if (data.sku) {
      generateBarcodeDataUrl(data.sku, data.barcodeType, data.size.width).then(setBarcodeUrl);
    } else {
      setBarcodeUrl('');
    }
  }, [data.sku, data.barcodeType, data.size.width]);

  const { width, height } = data.size;
  const isLargeFormat = height > 100; // A4 etc.

  // Scale to fit preview area — larger area for large formats
  const maxW = isLargeFormat ? 400 : 520;
  const maxH = isLargeFormat ? 560 : 260;
  const scale = Math.min(maxW / width, maxH / height, 6);
  const scaledW = width * scale;
  const scaledH = height * scale;

  const fontSize = Math.max(height * 0.08, 2);

  // Adaptive ratios: large formats need less relative space for desc/table
  const descAreaRatio = isLargeFormat ? 0.12 : 0.24;
  const tableAreaRatio = isLargeFormat ? 0.08 : 0.18;

  // Dynamic font sizing: fits any label size and text length
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

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div
          ref={ref}
          className="print-area relative bg-white border-2 border-black overflow-hidden"
          style={{
            width: `${scaledW}px`,
            height: `${scaledH}px`,
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
            color: '#000',
            '--print-w': `${width}mm`,
            '--print-h': `${height}mm`,
            '--print-scale-x': `${(width * 3.7795) / scaledW}`,
            '--print-scale-y': `${(height * 3.7795) / scaledH}`,
          } as React.CSSProperties}
        >
          {/* Item Description (fixed area) */}
          <div
            className="absolute left-0 right-0 top-0 px-[4%] pt-[2%] leading-tight font-bold overflow-hidden text-center border-b border-black"
            style={{
              height: `${height * descAreaRatio * scale}px`,
              fontSize: `${titleFontSize * scale}px`,
              lineHeight: 1.2,
              display: '-webkit-box',
              WebkitLineClamp: descMaxLines,
              WebkitBoxOrient: 'vertical',
              overflowWrap: 'break-word',
              wordBreak: 'normal',
            }}
          >
            {data.itemDescription || '—'}
          </div>

          {/* Barcode (fixed area) */}
          <div
            className="absolute left-0 right-0 flex flex-col items-center justify-center"
            style={{
              top: `${height * descAreaRatio * scale}px`,
              bottom: `${height * tableAreaRatio * scale}px`,
              padding: `${4 * scale}px 0`,
            }}
          >
            {barcodeUrl ? (
              <img
                src={barcodeUrl}
                alt="barcode"
                style={{ width: '90%', height: '90%', objectFit: isLargeFormat ? 'contain' : 'fill' }}
              />
            ) : (
            <div
                className="flex items-center justify-center text-muted-foreground border border-dashed border-border"
                style={{ width: '90%', height: '80%', fontSize: `${fontSize * scale * 0.7}px` }}
              >
                [barcode]
              </div>
            )}
          </div>

          {/* Table at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 border-t-2 border-black flex"
            style={{ height: `${height * tableAreaRatio * scale}px` }}
          >
            {/* SKU column */}
            <div className="flex-1 border-r border-black flex flex-col items-center justify-center">
              <div className="uppercase whitespace-nowrap font-bold" style={{ fontSize: `${fontSize * scale * 0.5}px`, opacity: 0.7 }}>SKU</div>
              <div className="font-bold font-mono" style={{ fontSize: `${fontSize * scale * 0.85}px` }}>
                {data.sku || '—'}
              </div>
            </div>
            {/* Rev column */}
            <div className={`flex-1 ${data.template === 'box' ? 'border-r border-black' : ''} flex flex-col items-center justify-center`}>
              <div className="uppercase whitespace-nowrap font-bold" style={{ fontSize: `${fontSize * scale * 0.5}px`, opacity: 0.7 }}>Rev.</div>
              <div className="font-bold font-mono" style={{ fontSize: `${fontSize * scale * 0.85}px` }}>
                {data.revision || '—'}
              </div>
            </div>
            {/* Box Qty column (only for box template) */}
            {data.template === 'box' && (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="uppercase whitespace-nowrap font-bold" style={{ fontSize: `${fontSize * scale * 0.5}px`, opacity: 0.7 }}>
                  {data.qtyType === 'pallet' ? 'Pallet Qty' : data.qtyType === 'set' ? 'Set Qty' : 'Box Qty'}
                </div>
                <div className="font-bold font-mono" style={{ fontSize: `${fontSize * scale * 0.85}px` }}>
                  {data.boxQty ?? '—'}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="text-xs text-muted-foreground font-mono">
        {width}×{height} мм · {data.barcodeType === 'code128' ? 'Code 128' : 'Code 39'}
      </div>
    </div>
  );
});

LabelPreview.displayName = 'LabelPreview';
export default LabelPreview;
