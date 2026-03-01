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
  // Scale to fit a fixed preview area (520×260) for consistent sizing
  const maxW = 520;
  const maxH = 260;
  const scale = Math.min(maxW / width, maxH / height, 6);
  const scaledW = width * scale;
  const scaledH = height * scale;

  const fontSize = Math.max(height * 0.08, 2);
  const descAreaRatio = 0.28;
  const tableAreaRatio = 0.28;
  const descMaxLines = 3;

  // Keep description strictly inside fixed top area
  const descLen = Math.max(data.itemDescription.length, 1);
  const baseTitleFont = Math.max(height * 0.1, 2.5);
  const compressionByLength = Math.max(0.38, Math.min(1, 42 / descLen));
  const maxFontByHeight = (height * (descAreaRatio - 0.02)) / (descMaxLines * 1.25);
  const titleFontSize = Math.max(1.6, Math.min(baseTitleFont * compressionByLength, maxFontByHeight));

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
          }}
        >
          {/* Item Description (fixed area) */}
          <div
            className="absolute left-0 right-0 top-0 px-[4%] pt-[2%] leading-tight font-bold overflow-hidden text-center"
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
                style={{ maxWidth: '90%', height: `${height * 0.34 * scale}px`, objectFit: 'contain' }}
              />
            ) : (
            <div
                className="flex items-center justify-center text-muted-foreground border border-dashed border-border"
                style={{ width: '70%', height: `${height * 0.3 * scale}px`, fontSize: `${fontSize * scale * 0.7}px` }}
              >
                [barcode]
              </div>
            )}
          </div>

          {/* Table at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 border-t-2 border-black flex"
            style={{ height: `${height * 0.28 * scale}px` }}
          >
            {/* SKU column */}
            <div className="flex-1 border-r border-black flex flex-col justify-center px-[4%]">
              <div className="uppercase font-medium" style={{ fontSize: `${fontSize * scale * 0.6}px` }}>SKU</div>
              <div className="font-bold font-mono" style={{ fontSize: `${fontSize * scale * 0.9}px` }}>
                {data.sku || '—'}
              </div>
            </div>
            {/* Rev column */}
            <div className={`flex-1 ${data.template === 'box' ? 'border-r border-black' : ''} flex flex-col justify-center px-[4%]`}>
              <div className="uppercase font-medium" style={{ fontSize: `${fontSize * scale * 0.6}px` }}>Rev.</div>
              <div className="font-bold font-mono" style={{ fontSize: `${fontSize * scale * 0.9}px` }}>
                {data.revision || '—'}
              </div>
            </div>
            {/* Box Qty column (only for box template) */}
            {data.template === 'box' && (
              <div className="flex-1 flex flex-col justify-center px-[4%]">
                <div className="uppercase font-medium" style={{ fontSize: `${fontSize * scale * 0.6}px` }}>
                  {data.qtyType === 'pallet' ? 'Pallet Qty' : data.qtyType === 'set' ? 'Set Qty' : 'Box Qty'}
                </div>
                <div className="font-bold font-mono" style={{ fontSize: `${fontSize * scale * 0.9}px` }}>
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
