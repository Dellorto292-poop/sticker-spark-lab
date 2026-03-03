import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type GridConfig, defaultGridConfig, generateA4GridPdf } from '@/lib/pdf-label';
import type { LabelData } from '@/lib/label-types';
import { t, type Lang } from '@/lib/i18n';
import { AlertTriangle, Grid3X3, Download } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: LabelData;
  lang: Lang;
}

const A4_W = 210;
const A4_H = 297;

export default function A4PrintDialog({ open, onOpenChange, data, lang }: Props) {
  const [hGap, setHGap] = useState(2);
  const [vGap, setVGap] = useState(2);
  const [margin, setMargin] = useState(10);

  useEffect(() => {
    if (open) {
      const cfg = defaultGridConfig(data.size.width, data.size.height);
      setHGap(cfg.hGapMm);
      setVGap(cfg.vGapMm);
      setMargin(cfg.marginMm);
    }
  }, [open, data.size.width, data.size.height]);

  const { cols, rows, totalLabels } = useMemo(() => {
    const lw = data.size.width;
    const lh = data.size.height;
    const c = Math.max(1, Math.floor((A4_W - 2 * margin + hGap) / (lw + hGap)));
    const r = Math.max(1, Math.floor((A4_H - 2 * margin + vGap) / (lh + vGap)));
    return { cols: c, rows: r, totalLabels: c * r };
  }, [data.size.width, data.size.height, hGap, vGap, margin]);

  // Visual preview scale: fit A4 into ~280px height
  const previewScale = 280 / A4_H;

  const handleDownload = () => {
    const config: GridConfig = { cols, rows, hGapMm: hGap, vGapMm: vGap, marginMm: margin };
    generateA4GridPdf(data, config);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5" />
            {t(lang, 'printA4')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20 text-sm">
            <AlertTriangle className="w-4 h-4 text-accent shrink-0" />
            <span>{t(lang, 'printWarning')}</span>
          </div>

          {/* A4 Visual Preview */}
          <div className="flex justify-center">
            <div
              className="relative bg-white border-2 border-border rounded shadow-sm"
              style={{
                width: A4_W * previewScale,
                height: A4_H * previewScale,
              }}
            >
              {Array.from({ length: rows }).map((_, r) =>
                Array.from({ length: cols }).map((_, c) => {
                  const lx = margin + c * (data.size.width + hGap);
                  const ly = margin + r * (data.size.height + vGap);
                  // Skip if out of bounds
                  if (lx + data.size.width > A4_W - margin + 0.5) return null;
                  if (ly + data.size.height > A4_H - margin + 0.5) return null;
                  return (
                    <div
                      key={`${r}-${c}`}
                      className="absolute border border-primary/60 bg-primary/10 rounded-[1px]"
                      style={{
                        left: lx * previewScale,
                        top: ly * previewScale,
                        width: data.size.width * previewScale,
                        height: data.size.height * previewScale,
                      }}
                    />
                  );
                })
              )}
              {/* Label in center of first cell for context */}
              <div className="absolute inset-0 flex items-end justify-center pb-1">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {data.size.width}×{data.size.height} {lang === 'ru' ? 'мм' : 'mm'} — {totalLabels} {lang === 'ru' ? 'шт.' : 'pcs'}
                </span>
              </div>
            </div>
          </div>

          {/* Gap & margin controls */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">{t(lang, 'hGap')}</Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={hGap}
                onChange={e => setHGap(Math.max(0, parseInt(e.target.value) || 0))}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">{t(lang, 'vGap')}</Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={vGap}
                onChange={e => setVGap(Math.max(0, parseInt(e.target.value) || 0))}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">{t(lang, 'pageMargin')}</Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={margin}
                onChange={e => setMargin(Math.max(0, parseInt(e.target.value) || 0))}
                className="font-mono text-sm"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t(lang, 'back')}
          </Button>
          <Button onClick={handleDownload} className="gap-2">
            <Download className="w-4 h-4" />
            {lang === 'ru' ? 'Скачать PDF' : 'Download PDF'} ({totalLabels} {lang === 'ru' ? 'шт.' : 'pcs'})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
