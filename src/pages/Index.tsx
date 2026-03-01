import { useState, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import LabelForm from '@/components/LabelForm';
import LabelPreview from '@/components/LabelPreview';
import HistoryPanel from '@/components/HistoryPanel';
import { t, type Lang } from '@/lib/i18n';
import { addToHistory } from '@/lib/history';
import type { LabelData, TemplateType } from '@/lib/label-types';
import { generateId, DEFAULT_SKU_REGEX } from '@/lib/label-types';
import {
  Printer, FileText, FileImage, Package, Box,
  ArrowLeft, Languages
} from 'lucide-react';

function createDefaultData(template: TemplateType): LabelData {
  return {
    id: generateId(),
    template,
    itemDescription: '',
    sku: '',
    revision: '00',
    boxQty: template === 'box' ? 1 : undefined,
    qtyType: template === 'box' ? 'box' : undefined,
    barcodeType: 'code39',
    size: { width: 60, height: 30 },
    dpi: 203,
    createdAt: Date.now(),
  };
}

export default function Index() {
  const [lang, setLang] = useState<Lang>('ru');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);
  const [data, setData] = useState<LabelData>(createDefaultData('unit'));
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [skuRegex, setSkuRegex] = useState(DEFAULT_SKU_REGEX);
  const previewRef = useRef<HTMLDivElement>(null);

  const isFormValid = (() => {
    if (!data.itemDescription.trim()) return false;
    if (!data.sku) return false;
    try {
      const re = new RegExp(skuRegex);
      if (!re.test(data.sku)) return false;
    } catch { /* skip */ }
    if (!data.revision || !/^\d{2}$/.test(data.revision)) return false;
    if (data.template === 'box' && (!data.boxQty || data.boxQty < 1 || !Number.isInteger(data.boxQty))) return false;
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
    if (!data.itemDescription.trim()) errs.itemDescription = t(lang, 'required');
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

  const handleExport = async (type: 'pdf' | 'png' | 'print') => {
    if (!validate()) return;

    const entry = { ...data, id: generateId(), createdAt: Date.now() };
    addToHistory(entry);
    setHistoryRefresh((n) => n + 1);

    if (type === 'print') {
      window.print();
      return;
    }

    if (!previewRef.current) return;

    try {
      const dataUrl = await toPng(previewRef.current, {
        pixelRatio: data.dpi === 300 ? 4 : 3,
        backgroundColor: '#ffffff',
      });

      if (type === 'png') {
        const link = document.createElement('a');
        link.download = `${data.sku || 'label'}.png`;
        link.href = dataUrl;
        link.click();
      } else if (type === 'pdf') {
        const img = new Image();
        img.src = dataUrl;
        await new Promise((r) => (img.onload = r));

        const pdf = new jsPDF({
          orientation: data.size.width > data.size.height ? 'landscape' : 'portrait',
          unit: 'mm',
          format: [data.size.width, data.size.height],
        });
        pdf.addImage(dataUrl, 'PNG', 0, 0, data.size.width, data.size.height);
        pdf.save(`${data.sku || 'label'}.pdf`);
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const handleRepeat = (item: LabelData) => {
    if (item.sku) {
      setData({ ...item, id: generateId(), createdAt: Date.now() });
      setSelectedTemplate(item.template);
    }
    setHistoryRefresh((n) => n + 1);
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
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => selectTemplate('unit')}
                className="group p-6 rounded-xl border-2 border-border bg-card hover:border-primary hover:shadow-md transition-all text-left space-y-3"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Package className="w-5 h-5 text-secondary-foreground group-hover:text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{t(lang, 'unitLabel')}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{t(lang, 'unitLabelDesc')}</p>
                </div>
              </button>

              <button
                onClick={() => selectTemplate('box')}
                className="group p-6 rounded-xl border-2 border-border bg-card hover:border-primary hover:shadow-md transition-all text-left space-y-3"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Box className="w-5 h-5 text-secondary-foreground group-hover:text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{t(lang, 'boxLabel')}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{t(lang, 'boxLabelDesc')}</p>
                </div>
              </button>
            </div>

            <div className="pt-4 border-t border-border">
              <HistoryPanel lang={lang} onRepeat={handleRepeat} refreshKey={historyRefresh} />
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
              ) : (
                <Box className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="font-semibold text-sm">
                {data.template === 'unit' ? t(lang, 'unitLabel') : t(lang, 'boxLabel')}
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

            <div className="bg-card border border-border rounded-xl p-5">
              <HistoryPanel lang={lang} onRepeat={handleRepeat} refreshKey={historyRefresh} />
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

            <div className="grid grid-cols-3 gap-3">
              <Button onClick={() => handleExport('print')} variant="outline" className="h-11" disabled={!isFormValid}>
                <Printer className="w-4 h-4 mr-2" />
                {t(lang, 'print')}
              </Button>
              <Button onClick={() => handleExport('pdf')} className="h-11" disabled={!isFormValid}>
                <FileText className="w-4 h-4 mr-2" />
                {t(lang, 'downloadPdf')}
              </Button>
              <Button onClick={() => handleExport('png')} variant="outline" className="h-11" disabled={!isFormValid}>
                <FileImage className="w-4 h-4 mr-2" />
                {t(lang, 'downloadPng')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
