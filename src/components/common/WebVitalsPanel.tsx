/**
 * لوحة عرض مؤشرات Core Web Vitals في صفحة التشخيص
 */
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Gauge } from 'lucide-react';
import { getVitalsSnapshot, type VitalsSnapshot } from '@/lib/monitoring/webVitals';

interface VitalDef {
  key: keyof Omit<VitalsSnapshot, 'updatedAt'>;
  label: string;
  unit: string;
  good: number;
  poor: number;
}

const VITALS: VitalDef[] = [
  { key: 'lcp', label: 'أكبر رسم للمحتوى (LCP)', unit: 'ms', good: 2500, poor: 4000 },
  { key: 'fcp', label: 'أول رسم للمحتوى (FCP)', unit: 'ms', good: 1800, poor: 3000 },
  { key: 'inp', label: 'تفاعل الإدخال (INP)', unit: 'ms', good: 200, poor: 500 },
  { key: 'cls', label: 'إزاحة التخطيط (CLS)', unit: '', good: 0.1, poor: 0.25 },
  { key: 'ttfb', label: 'وقت أول بايت (TTFB)', unit: 'ms', good: 800, poor: 1800 },
];

function getRating(value: number, good: number, poor: number): 'good' | 'needs-improvement' | 'poor' {
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

const RATING_STYLES = {
  good: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/30', label: 'جيد' },
  'needs-improvement': { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/30', label: 'يحتاج تحسين' },
  poor: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/30', label: 'ضعيف' },
};

export default function WebVitalsPanel() {
  const [data, setData] = useState<VitalsSnapshot>(getVitalsSnapshot);

  const refresh = useCallback(() => {
    setData(getVitalsSnapshot());
  }, []);

  const hasAny = VITALS.some(v => data[v.key] !== null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            مؤشرات الأداء (Core Web Vitals)
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={refresh} title="تحديث القراءات">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {!hasAny ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            لم تُسجّل بعد — تنقّل في التطبيق ثم عُد هنا لرؤية المؤشرات
          </p>
        ) : (
          VITALS.map(v => {
            const value = data[v.key];
            if (value === null) return (
              <div key={v.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-sm">{v.label}</span>
                <span className="text-xs text-muted-foreground">—</span>
              </div>
            );
            const rating = getRating(value, v.good, v.poor);
            const style = RATING_STYLES[rating];
            return (
              <div key={v.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-sm">{v.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-sm font-bold ${style.text}`}>
                    {v.key === 'cls' ? value.toFixed(3) : Math.round(value)}{v.unit && ` ${v.unit}`}
                  </span>
                  <Badge variant="outline" className={`text-xs ${style.text} ${style.border} ${style.bg}`}>
                    {style.label}
                  </Badge>
                </div>
              </div>
            );
          })
        )}
        {data.updatedAt > 0 && (
          <p className="text-xs text-muted-foreground text-left pt-1">
            آخر تحديث: {new Date(data.updatedAt).toLocaleTimeString('ar-SA')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
