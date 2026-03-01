import { useEffect, useState, forwardRef } from 'react';
import { generateBarcodeDataUrl } from '@/lib/barcode';
import type { LabelData } from '@/lib/label-types';

interface Props {
  data: LabelData;
  showAnnotations?: boolean;
}

const LabelPreview = forwardRef<HTMLDivElement, Props>(({ data, showAnnotations }, ref) => {
  const [barcodeUrl, setBarcodeUrl] = useState('');

  useEffect(() => {
    if (data.sku) {
      generateBarcodeDataUrl(data.sku, data.barcodeType, data.size.width).then(setBarcodeUrl);
    } else {
      setBarcodeUrl('');
    }
  }, [data.sku, data.barcodeType, data.size.width]);

  const { width, height } = data.size;
  // Scale to fit preview area: max 400px wide
  const scale = Math.min(520 / width, 400 / height, 6);
  const scaledW = width * scale;
  const scaledH = height * scale;

  const fontSize = Math.max(height * 0.08, 2);
  const titleFontSize = Math.max(height * 0.1, 2.5);

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
          {/* Item Description */}
          <div
            className="px-[4%] pt-[3%] leading-tight font-bold break-words overflow-hidden"
            style={{
              fontSize: `${(data.itemDescription.length > 60 ? titleFontSize * 0.6 : data.itemDescription.length > 30 ? titleFontSize * 0.8 : titleFontSize) * scale}px`,
              maxHeight: `${height * 0.3 * scale}px`,
            }}
          >
            {data.itemDescription || '—'}
          </div>

          {/* Barcode */}
          <div className="flex flex-col items-center justify-center" style={{ padding: `${3 * scale}px 0` }}>
            {barcodeUrl ? (
              <img
                src={barcodeUrl}
                alt="barcode"
                style={{ maxWidth: '90%', height: `${height * 0.35 * scale}px`, objectFit: 'contain' }}
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
                <div className="uppercase font-medium" style={{ fontSize: `${fontSize * scale * 0.6}px` }}>Box Qty</div>
                <div className="font-bold font-mono" style={{ fontSize: `${fontSize * scale * 0.9}px` }}>
                  {data.boxQty ?? '—'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Annotations overlay */}
        {showAnnotations && (
          <div className="absolute inset-0 pointer-events-none" style={{ width: `${scaledW}px`, height: `${scaledH}px` }}>
            <div className="absolute top-0 left-0 bg-primary/90 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-br font-sans">
              Item Description
            </div>
            <div className="absolute text-[10px] bg-primary/90 text-primary-foreground px-1.5 py-0.5 rounded font-sans"
              style={{ top: '35%', right: '-2px', transform: 'translateX(100%)' }}>
              ← Barcode (SKU)
            </div>
            <div className="absolute bottom-0 left-0 bg-primary/90 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-tr font-sans">
              {data.template === 'box' ? 'SKU | Rev. | Box Qty' : 'SKU | Rev.'}
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground font-mono">
        {width}×{height} мм · {data.barcodeType === 'code128' ? 'Code 128' : 'Code 39'}
      </div>
    </div>
  );
});

LabelPreview.displayName = 'LabelPreview';
export default LabelPreview;
