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

  const fontSize = isLargeFormat ? Math.max(height * 0.04, 6) : Math.max(height * 0.12, 2.5);

  const isDesign = data.template === 'design';
  const isCompactFormat = height <= 24;
  const isBoxTemplate = data.template === 'box';

  // Adaptive ratios: large formats need less relative space for desc/table
  const descAreaRatio = isDesign ? 0 : (isLargeFormat ? 0.25 : 0.24);
  // Non-box templates use compact horizontal layout → smaller table area
  const tableAreaRatio = isBoxTemplate
    ? (isLargeFormat ? 0.15 : (isCompactFormat ? 0.24 : 0.18))
    : (isLargeFormat ? 0.10 : (isCompactFormat ? 0.16 : 0.12));

  // Dynamic font sizing (only used when description is shown)
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
  const tableLabelScale = isCompactFormat ? 0.4 : 0.5;
  const tableValueScale = isCompactFormat ? 0.7 : 0.85;

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
          {/* Item Description (fixed area) — hidden for design template */}
          {!isDesign && (
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
          )}

          {/* Barcode (fixed area) */}
          <div
            className="absolute left-0 right-0 flex flex-col items-center justify-center"
            style={{
              top: `${height * descAreaRatio * scale}px`,
              bottom: `${height * tableAreaRatio * scale}px`,
              padding: `${3 * scale}px`,
            }}
          >
            {barcodeUrl ? (
              <img
                src={barcodeUrl}
                alt="barcode"
                style={{ width: `calc(100% - ${6 * scale}px)`, height: `calc(100% - ${6 * scale}px)`, objectFit: isLargeFormat ? 'contain' : 'fill' }}
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
            {isBoxTemplate ? (
              <>
                {/* SKU column */}
                <div className="flex-1 border-r border-black flex flex-col items-center justify-center leading-none">
                  <div className="uppercase whitespace-nowrap font-bold" style={{ fontSize: `${fontSize * scale * tableLabelScale}px`, opacity: 0.7, lineHeight: 1 }}>SKU</div>
                  <div className="font-bold font-mono" style={{ fontSize: `${fontSize * scale * tableValueScale}px`, lineHeight: 1 }}>
                    {data.sku || '—'}
                  </div>
                </div>
                {/* Rev column */}
                <div className="flex-1 border-r border-black flex flex-col items-center justify-center leading-none">
                  <div className="uppercase whitespace-nowrap font-bold" style={{ fontSize: `${fontSize * scale * tableLabelScale}px`, opacity: 0.7, lineHeight: 1 }}>Rev.</div>
                  <div className="font-bold font-mono" style={{ fontSize: `${fontSize * scale * tableValueScale}px`, lineHeight: 1 }}>
                    {data.revision || '—'}
                  </div>
                </div>
                {/* Box Qty column */}
                <div className="flex-1 flex flex-col items-center justify-center leading-none">
                  <div className="uppercase whitespace-nowrap font-bold" style={{ fontSize: `${fontSize * scale * tableLabelScale}px`, opacity: 0.7, lineHeight: 1 }}>
                    {data.qtyType === 'pallet' ? 'Pallet Qty' : data.qtyType === 'set' ? 'Set Qty' : 'Box Qty'}
                  </div>
                  <div className="font-bold font-mono" style={{ fontSize: `${fontSize * scale * tableValueScale}px`, lineHeight: 1 }}>
                    {data.boxQty ?? '—'}
                  </div>
                </div>
              </>
            ) : (
              /* Horizontal compact layout for individual/design: "SKU value | Rev. value" */
              <>
                <div className="flex-1 border-r border-black flex items-center justify-center gap-[2%] leading-none px-[3%]">
                  <div className="uppercase whitespace-nowrap font-bold" style={{ fontSize: `${fontSize * scale * tableLabelScale}px`, opacity: 0.7, lineHeight: 1 }}>SKU</div>
                  <div className="font-bold font-mono" style={{ fontSize: `${fontSize * scale * tableValueScale}px`, lineHeight: 1 }}>
                    {data.sku || '—'}
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center gap-[2%] leading-none px-[3%]">
                  <div className="uppercase whitespace-nowrap font-bold" style={{ fontSize: `${fontSize * scale * tableLabelScale}px`, opacity: 0.7, lineHeight: 1 }}>Rev.</div>
                  <div className="font-bold font-mono" style={{ fontSize: `${fontSize * scale * tableValueScale}px`, lineHeight: 1 }}>
                    {data.revision || '—'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      <div className="text-xs text-muted-foreground font-mono font-bold">
        {width}×{height} мм · {data.barcodeType === 'code128' ? 'Code 128' : 'Code 39'}
      </div>
    </div>
  );
});

LabelPreview.displayName = 'LabelPreview';
export default LabelPreview;
