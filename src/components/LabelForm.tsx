import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LabelData, QtyType } from '@/lib/label-types';
import { SIZE_PRESETS, SIZE_PRESETS_BOX } from '@/lib/label-types';
import { t, type Lang } from '@/lib/i18n';

interface Props {
  data: LabelData;
  onChange: (data: Partial<LabelData>) => void;
  lang: Lang;
  errors: Record<string, string>;
}

export default function LabelForm({ data, onChange, lang, errors }: Props) {
  const presets = data.template === 'box' ? SIZE_PRESETS_BOX : SIZE_PRESETS;
  const sizePresetKey = presets.find(
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
          className={`resize-none font-mono text-sm ${!data.itemDescription.trim() ? 'border-destructive focus-visible:ring-destructive' : ''}`}
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
          onChange={(e) => {
            const v = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
            onChange({ sku: v });
          }}
          placeholder={t(lang, 'skuHint')}
          className={`font-mono text-sm ${!data.sku ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          maxLength={12}
        />
        {errors.sku && <p className="text-xs text-destructive">{errors.sku}</p>}
      </div>

      {/* Revision + Qty/Size row */}
      <div className="flex gap-4 flex-wrap">
        {/* Revision */}
        <div className="space-y-1.5 shrink-0">
          <Label htmlFor="revision" className="text-sm font-medium">
            {t(lang, 'revision')}
          </Label>
          <Input
            id="revision"
            value={data.revision}
            onChange={(e) => {
              const v = e.target.value.replace(/\s/g, '').replace(/\D/g, '').slice(0, 2);
              onChange({ revision: v });
            }}
            placeholder="00"
            className={`font-mono text-sm w-24 ${!data.revision || data.revision.length < 2 ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            maxLength={2}
          />
          {data.revision.length > 0 && data.revision.length < 2 && (
            <p className="text-xs text-destructive">{t(lang, 'invalidRevision')}</p>
          )}
          {errors.revision && <p className="text-xs text-destructive">{errors.revision}</p>}
        </div>

        {/* Qty (only for box template) */}
        {data.template === 'box' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                {t(lang, 'qtyTypeHint')}
              </Label>
              <Select
                value={data.qtyType ?? 'box'}
                onValueChange={(v) => onChange({ qtyType: v as QtyType })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="box">{t(lang, 'boxOption')}</SelectItem>
                  <SelectItem value="pallet">{t(lang, 'palletOption')}</SelectItem>
                  <SelectItem value="set">{t(lang, 'setOption')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 shrink-0">
              <Label htmlFor="boxQty" className="text-sm font-medium">
                {t(lang, 'qtyType')}
              </Label>
              <Input
                id="boxQty"
                value={data.boxQty ?? ''}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                  onChange({ boxQty: v ? parseInt(v) : undefined });
                }}
                placeholder={t(lang, 'boxQtyHint')}
                className={`font-mono text-sm w-20 ${!data.boxQty || data.boxQty < 1 ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              />
              {errors.boxQty && <p className="text-xs text-destructive">{errors.boxQty}</p>}
            </div>
          </>
        )}

        {/* Label size inline for unit template */}
        {data.template === 'unit' && (
          <div className="space-y-1.5 flex-1 min-w-[140px]">
            <Label className="text-sm font-medium">{t(lang, 'labelSize')}</Label>
            <Select
              value={sizePresetKey}
              onValueChange={(v) => {
                if (v === 'custom') { onChange({ size: { width: 55, height: 28 } }); return; }
                const [w, h] = v.split('x').map(Number);
                onChange({ size: { width: w, height: h } });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={`${p.width}x${p.height}`} value={`${p.width}x${p.height}`}>
                    {p.name}
                  </SelectItem>
                ))}
                <SelectItem value="custom">{t(lang, 'customSize')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Custom size inputs for unit template */}
      {data.template === 'unit' && sizePresetKey === 'custom' && (
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

      {/* Settings section (only for box template) */}
      {data.template === 'box' && (
        <div className="pt-3 border-t border-border space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t(lang, 'settings')}
          </h3>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t(lang, 'labelSize')}</Label>
            <Select
              value={sizePresetKey}
              onValueChange={(v) => {
                if (v === 'custom') { onChange({ size: { width: 55, height: 28 } }); return; }
                const [w, h] = v.split('x').map(Number);
                onChange({ size: { width: w, height: h } });
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={`${p.width}x${p.height}`} value={`${p.width}x${p.height}`}>
                    {p.name}
                  </SelectItem>
                ))}
                <SelectItem value="custom">{t(lang, 'customSize')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {sizePresetKey === 'custom' && (
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">{t(lang, 'width')}</Label>
                <Input
                  type="number" min={20} max={200}
                  value={data.size.width}
                  onChange={(e) => onChange({ size: { ...data.size, width: Math.max(20, parseInt(e.target.value) || 20) } })}
                  className="text-sm font-mono"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">{t(lang, 'height')}</Label>
                <Input
                  type="number" min={10} max={200}
                  value={data.size.height}
                  onChange={(e) => onChange({ size: { ...data.size, height: Math.max(10, parseInt(e.target.value) || 10) } })}
                  className="text-sm font-mono"
                />
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
