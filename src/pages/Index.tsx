import { useState, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { generateThermalPdf, downloadVectorPdf } from '@/lib/pdf-label';
import { Button } from '@/components/ui/button';
import { Ruler } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import LabelForm from '@/components/LabelForm';
import LabelPreview from '@/components/LabelPreview';
import A4PrintDialog from '@/components/A4PrintDialog';
import { t, type Lang } from '@/lib/i18n';
import type { LabelData, TemplateType } from '@/lib/label-types';
import { generateId, DEFAULT_SKU_REGEX } from '@/lib/label-types';
import {
  Printer, FileText, FileImage, Package, Box,
  ArrowLeft, Languages, WifiOff, Grid3X3, PenTool
} from 'lucide-react';

function createDefaultData(template: TemplateType): LabelData {
  return {
    id: generateId(),
    template,
    itemDescription: template === 'design' ? '' : '',
    sku: '',
    revision: '00',
    boxQty: template === 'box' ? 1 : undefined,
    qtyType: template === 'box' ? 'box' : undefined,
    barcodeType: 'code39',
    size: template === 'design' ? { width: 40, height: 20 } : { width: 58, height: 40 },
    dpi: 203,
    createdAt: Date.now(),
  };
}

export default function Index() {
  const [lang, setLang] = useState<Lang>('ru');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);
  const [data, setData] = useState<LabelData>(createDefaultData('unit'));
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [skuRegex, setSkuRegex] = useState(DEFAULT_SKU_REGEX);
  const [a4DialogOpen, setA4DialogOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const isFormValid = (() => {
    if (data.template !== 'design' && !data.itemDescription.trim()) return false;
    if (!data.sku) return false;
    try {
      const re = new RegExp(skuRegex);
      if (!re.test(data.sku)) return false;
    } catch { /* skip */ }
    if (!data.revision || !/^\d{2}$/.test(data.revision)) return false;
    if (data.template === 'box' && (!data.boxQty || data.boxQty < 1 || !Number.isInteger(data.boxQty))) return false;
    if (data.size.width > 190 || data.size.height > 277) return false;
    return true;
  })();

  const handleChange = useCallback((partial: Partial<LabelData>) => {
    setData((prev) => ({ ...prev, ...partial }));
    const keys = Object.keys(partial);
    setErrors((prev) => {
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });
  }, []);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (data.template !== 'design' && !data.itemDescription.trim()) errs.itemDescription = t(lang, 'required');
    if (!data.sku) errs.sku = t(lang, 'required');
    else {
      try {
        const re = new RegExp(skuRegex);
        if (!re.test(data.sku)) errs.sku = `${t(lang, 'invalidSku')} (${skuRegex})`;
      } catch {
        // invalid regex — skip validation
      }
    }
    if (!data.revision) errs.revision = t(lang, 'required');
    else if (!/^\d{2}$/.test(data.revision)) errs.revision = t(lang, 'invalidRevision');
    if (data.template === 'box') {
      if (!data.boxQty || data.boxQty < 1 || !Number.isInteger(data.boxQty))
        errs.boxQty = t(lang, 'invalidQty');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleExport = async (type: 'pdf' | 'png' | 'thermal' | 'a4') => {
    if (!validate()) return;

    try {
      if (type === 'thermal') {
        await generateThermalPdf(data);
        toast.success(lang === 'ru' ? 'PDF скачан — откройте и печатайте при 100%' : 'PDF downloaded — open and print at 100%');
        return;
      }

      if (type === 'a4') {
        setA4DialogOpen(true);
        return;
      }

      if (type === 'pdf') {
        await downloadVectorPdf(data);
        return;
      }

      if (!previewRef.current) return;

      const dataUrl = await toPng(previewRef.current, {
        pixelRatio: data.dpi === 300 ? 4 : 3,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `${data.sku || 'label'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export error:', err);
      toast.error(lang === 'ru' ? 'Ошибка экспорта' : 'Export error');
    }
  };

  const selectTemplate = (tmpl: TemplateType) => {
    setSelectedTemplate(tmpl);
    setData(createDefaultData(tmpl));
    setErrors({});
  };

  // Template selection screen
  if (!selectedTemplate) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border bg-card">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Package className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-none">{t(lang, 'appTitle')}</h1>
                <p className="text-xs text-muted-foreground">{t(lang, 'appSubtitle')}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
              className="font-mono text-xs"
            >
              <Languages className="w-3.5 h-3.5 mr-1.5" />
              {lang === 'ru' ? 'EN' : 'RU'}
            </Button>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-lg w-full space-y-6">
            <h2 className="text-xl font-semibold text-center">{t(lang, 'selectTemplate')}</h2>

            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/15 text-sm text-muted-foreground">
              <WifiOff className="w-4 h-4 text-primary shrink-0" />
              <span>{lang === 'ru' ? 'Работает офлайн после первой загрузки — можно установить как приложение' : 'Works offline after first load — can be installed as an app'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => selectTemplate('unit')}
                className="group p-6 rounded-xl border-2 border-border bg-card hover:border-primary hover:shadow-md transition-all text-left flex flex-col items-start gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Box className="w-5 h-5 text-secondary-foreground group-hover:text-primary" />
                </div>
                <h3 className="font-semibold text-sm">{t(lang, 'unitLabel')}</h3>
              </button>

              <button
                onClick={() => selectTemplate('box')}
                className="group p-6 rounded-xl border-2 border-border bg-card hover:border-primary hover:shadow-md transition-all text-left flex flex-col items-start gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Box className="w-5 h-5 text-secondary-foreground group-hover:text-primary" />
                </div>
                <h3 className="font-semibold text-sm">{t(lang, 'boxLabel')}</h3>
              </button>

              <button
                onClick={() => selectTemplate('design')}
                className="group p-6 rounded-xl border-2 border-border bg-card hover:border-primary hover:shadow-md transition-all text-left flex flex-col items-start gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <PenTool className="w-5 h-5 text-secondary-foreground group-hover:text-primary" />
                </div>
                <h3 className="font-semibold text-sm">{t(lang, 'designLabel')}</h3>
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // Editor screen
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              {t(lang, 'back')}
            </Button>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              {data.template === 'unit' ? (
                <Package className="w-4 h-4 text-muted-foreground" />
              ) : data.template === 'box' ? (
                <Box className="w-4 h-4 text-muted-foreground" />
              ) : (
                <PenTool className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="font-semibold text-sm">
                {data.template === 'unit' ? t(lang, 'unitLabel') : data.template === 'box' ? t(lang, 'boxLabel') : t(lang, 'designLabel')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
              className="font-mono text-xs"
            >
              <Languages className="w-3.5 h-3.5 mr-1.5" />
              {lang === 'ru' ? 'EN' : 'RU'}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Form */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <LabelForm
                data={data}
                onChange={handleChange}
                lang={lang}
                errors={errors}
              />
            </div>

          </div>

          {/* Right: Preview & Actions */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-5 sticky top-6">
              <h3 className="text-sm font-semibold mb-4">{t(lang, 'preview')}</h3>
              <div className="flex items-center justify-center bg-muted/30 rounded-lg p-6" style={{ minHeight: '320px' }}>
                <LabelPreview ref={previewRef} data={data} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => handleExport('pdf')} variant="outline" className="h-11 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors" disabled={!isFormValid}>
                <FileText className="w-4 h-4 mr-2" />
                {t(lang, 'downloadPdf')}
              </Button>
              <Button onClick={() => handleExport('png')} variant="outline" className="h-11 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors" disabled={!isFormValid}>
                <FileImage className="w-4 h-4 mr-2" />
                {t(lang, 'downloadPng')}
              </Button>
            </div>

            <Button onClick={() => handleExport('a4')} className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors" disabled={!isFormValid}>
              <Grid3X3 className="w-4 h-4 mr-2" />
              {lang === 'ru' ? 'Печать множества стикеров на листе А4' : 'Print multiple stickers on A4 sheet'}
            </Button>

            <A4PrintDialog
              open={a4DialogOpen}
              onOpenChange={setA4DialogOpen}
              data={data}
              lang={lang}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
