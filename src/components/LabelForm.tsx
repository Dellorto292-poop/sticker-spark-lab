import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { LabelData, BarcodeType, DPI } from '@/lib/label-types';
import { SIZE_PRESETS, DEFAULT_SKU_REGEX } from '@/lib/label-types';
import { t, type Lang } from '@/lib/i18n';
import { Settings2 } from 'lucide-react';

interface Props {
  data: LabelData;
  onChange: (data: Partial<LabelData>) => void;
  lang: Lang;
  errors: Record<string, string>;
  skuRegex: string;
  onSkuRegexChange: (v: string) => void;
}

export default function LabelForm({ data, onChange, lang, errors, skuRegex, onSkuRegexChange }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const sizePresetKey = SIZE_PRESETS.find(
    (p) => p.width === data.size.width && p.height === data.size.height
  )
    ? `${data.size.width}x${data.size.height}`
    : 'custom';

  return (
    <div className="space-y-4">
      {/* Item Description */}
      <div className="space-y-1.5">
        <Label htmlFor="itemDescription" className="text-sm font-medium">
          {t(lang, 'itemDescription')}
        </Label>
        <Textarea
          id="itemDescription"
          value={data.itemDescription}
          onChange={(e) => onChange({ itemDescription: e.target.value })}
          placeholder={t(lang, 'itemDescriptionHint')}
          rows={2}
          maxLength={150}
          className="resize-none font-mono text-sm"
        />
        {errors.itemDescription && (
          <p className="text-xs text-destructive">{errors.itemDescription}</p>
        )}
      </div>

      {/* SKU — NO auto-correction */}
      <div className="space-y-1.5">
        <Label htmlFor="sku" className="text-sm font-medium">
          {t(lang, 'sku')}
        </Label>
        <Input
          id="sku"
          value={data.sku}
          onChange={(e) => onChange({ sku: e.target.value })}
          placeholder={t(lang, 'skuHint')}
          className="font-mono text-sm"
          maxLength={30}
        />
        {errors.sku && <p className="text-xs text-destructive">{errors.sku}</p>}
      </div>

      {/* Revision — exactly 2 digits */}
      <div className="space-y-1.5">
        <Label htmlFor="revision" className="text-sm font-medium">
          {t(lang, 'revision')}
        </Label>
        <Input
          id="revision"
          value={data.revision}
          onChange={(e) => {
            const v = e.target.value.slice(0, 2);
            onChange({ revision: v });
          }}
          placeholder="00"
          className="font-mono text-sm w-24"
          maxLength={2}
        />
        {errors.revision && <p className="text-xs text-destructive">{errors.revision}</p>}
      </div>

      {/* Box Qty (only for box template) */}
      {data.template === 'box' && (
        <div className="space-y-1.5">
          <Label htmlFor="boxQty" className="text-sm font-medium">
            {t(lang, 'boxQty')}
          </Label>
          <Input
            id="boxQty"
            type="number"
            min={1}
            value={data.boxQty ?? ''}
            onChange={(e) => onChange({ boxQty: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder={t(lang, 'boxQtyHint')}
            className="font-mono text-sm w-28"
          />
          {errors.boxQty && <p className="text-xs text-destructive">{errors.boxQty}</p>}
        </div>
      )}

      {/* Settings section */}
      <div className="pt-3 border-t border-border space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t(lang, 'settings')}
        </h3>

        {/* Barcode type */}
        <div className="flex items-center justify-between">
          <Label className="text-sm">{t(lang, 'barcodeType')}</Label>
          <Select
            value={data.barcodeType}
            onValueChange={(v) => onChange({ barcodeType: v as BarcodeType })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="code39">Code 39</SelectItem>
              <SelectItem value="code128">Code 128</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Label size */}
        <div className="flex items-center justify-between">
          <Label className="text-sm">{t(lang, 'labelSize')}</Label>
          <Select
            value={sizePresetKey}
            onValueChange={(v) => {
              if (v === 'custom') return;
              const [w, h] = v.split('x').map(Number);
              onChange({ size: { width: w, height: h } });
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIZE_PRESETS.map((p) => (
                <SelectItem key={`${p.width}x${p.height}`} value={`${p.width}x${p.height}`}>
                  {p.name}
                </SelectItem>
              ))}
              <SelectItem value="custom">{t(lang, 'customSize')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom size inputs */}
        {sizePresetKey === 'custom' && (
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">{t(lang, 'width')}</Label>
              <Input
                type="number"
                min={20}
                max={200}
                value={data.size.width}
                onChange={(e) =>
                  onChange({ size: { ...data.size, width: Math.max(20, parseInt(e.target.value) || 20) } })
                }
                className="text-sm font-mono"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">{t(lang, 'height')}</Label>
              <Input
                type="number"
                min={10}
                max={200}
                value={data.size.height}
                onChange={(e) =>
                  onChange({ size: { ...data.size, height: Math.max(10, parseInt(e.target.value) || 10) } })
                }
                className="text-sm font-mono"
              />
            </div>
          </div>
        )}

        {/* DPI */}
        <div className="flex items-center justify-between">
          <Label className="text-sm">{t(lang, 'dpi')}</Label>
          <Select
            value={String(data.dpi)}
            onValueChange={(v) => onChange({ dpi: Number(v) as DPI })}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="203">203 dpi</SelectItem>
              <SelectItem value="300">300 dpi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Advanced settings */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors pt-1">
          <Settings2 className="w-3.5 h-3.5" />
          {t(lang, 'advanced')}
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-2">
          <div className="space-y-1.5">
            <Label className="text-xs">{t(lang, 'skuRegex')}</Label>
            <Input
              value={skuRegex}
              onChange={(e) => onSkuRegexChange(e.target.value)}
              placeholder={DEFAULT_SKU_REGEX}
              className="font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground">{t(lang, 'skuRegexHint')}</p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
