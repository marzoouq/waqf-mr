/**
 * أرشيف آخر 10 تشغيلات للتشخيص — مع تصدير JSON.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Download } from 'lucide-react';
import { useState } from 'react';
import { getHistory, clearHistory, type HistoryEntry } from '@/lib/diagnostics/history';
import { fmtDateTime } from '@/utils/format/format';
import { toast } from 'sonner';

export default function RunHistoryList() {
  const [items, setItems] = useState<HistoryEntry[]>(() => getHistory());

  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagnostics-history-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('تم تصدير السجل');
    } catch {
      toast.error('تعذّر التصدير');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">آخر التشغيلات</CardTitle>
        {items.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 me-1" /> تصدير JSON
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { clearHistory(); setItems([]); }}>
              <Trash2 className="w-4 h-4 me-1" /> مسح
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا يوجد سجلّ. شغّل الفحص لإنشاء أول تسجيل.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 p-2 border rounded-md text-sm">
                <span className="font-mono text-xs text-muted-foreground">{fmtDateTime(new Date(it.at))}</span>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-success">✓ {it.pass}</Badge>
                  <Badge variant="outline" className="text-warning">⚠ {it.warn}</Badge>
                  <Badge variant="outline" className="text-destructive">✗ {it.fail}</Badge>
                  <Badge variant="outline" className="text-primary">{it.healthScore}/100</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
