import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type GridConfig, defaultGridConfig, generateA4GridPdf } from '@/lib/pdf-label';
import type { LabelData } from '@/lib/label-types';
import { t, type Lang } from '@/lib/i18n';
import { AlertTriangle, Grid3X3, Printer } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: LabelData;
  lang: Lang;
}

export default function A4PrintDialog({ open, onOpenChange, data, lang }: Props) {
  const [config, setConfig] = useState<GridConfig>(() =>
    defaultGridConfig(data.size.width, data.size.height)
  );

  useEffect(() => {
    if (open) {
      setConfig(defaultGridConfig(data.size.width, data.size.height));
    }
  }, [open, data.size.width, data.size.height]);

  const totalLabels = config.cols * config.rows;

  const handlePrint = () => {
    generateA4GridPdf(data, config);
    onOpenChange(false);
  };

  const update = (key: keyof GridConfig, value: string) => {
    const num = parseInt(value) || 0;
    setConfig(prev => ({ ...prev, [key]: Math.max(key === 'cols' || key === 'rows' ? 1 : 0, num) }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">{t(lang, 'gridCols')}</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={config.cols}
                onChange={e => update('cols', e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">{t(lang, 'gridRows')}</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={config.rows}
                onChange={e => update('rows', e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">{t(lang, 'hGap')}</Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={config.hGapMm}
                onChange={e => update('hGapMm', e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">{t(lang, 'vGap')}</Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={config.vGapMm}
                onChange={e => update('vGapMm', e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium">{t(lang, 'pageMargin')}</Label>
            <Input
              type="number"
              min={0}
              max={50}
              value={config.marginMm}
              onChange={e => update('marginMm', e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="text-sm text-muted-foreground text-center font-mono">
            {data.size.width}×{data.size.height} мм × {totalLabels} шт.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t(lang, 'back')}
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            {t(lang, 'printA4')} ({totalLabels} шт.)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
