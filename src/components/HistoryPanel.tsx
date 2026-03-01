import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getHistory, clearHistory } from '@/lib/history';
import type { LabelData } from '@/lib/label-types';
import { t, type Lang } from '@/lib/i18n';
import { RotateCcw, Trash2, Package, Box } from 'lucide-react';

interface Props {
  lang: Lang;
  onRepeat: (data: LabelData) => void;
  refreshKey: number;
}

export default function HistoryPanel({ lang, onRepeat, refreshKey }: Props) {
  const history = getHistory();
  // refreshKey used to trigger re-render

  return (
    <div className="space-y-3" data-refresh={refreshKey}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{t(lang, 'history')}</h3>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearHistory();
              onRepeat({} as LabelData); // trigger refresh
            }}
            className="text-xs text-muted-foreground h-7"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            {t(lang, 'clearHistory')}
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">{t(lang, 'historyEmpty')}</p>
      ) : (
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 p-2.5 rounded-md border border-border bg-card hover:bg-secondary/50 transition-colors group"
              >
                <div className="mt-0.5">
                  {item.template === 'unit' ? (
                    <Package className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <Box className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono font-semibold truncate">{item.sku}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{item.itemDescription}</div>
                  <div className="text-[10px] text-muted-foreground">
                    Rev. {item.revision} · {item.size.width}×{item.size.height}мм
                    {item.template === 'box' && item.boxQty ? ` · Qty: ${item.boxQty}` : ''}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRepeat(item)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
