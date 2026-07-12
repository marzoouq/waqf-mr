/**
 * EdgeFunctionsPanel — إحصائيات Edge Functions (نجاح/فشل/زمن) + قياس Latency الحيّ
 */
import { useEffect, useState } from 'react';
import { useEdgeFunctionsStats } from '@/hooks/data/diagnostics/useEdgeFunctionsStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Zap, RefreshCw, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

interface PingResult { name: string; ok: boolean; status: number; latencyMs: number; error?: string }

export default function EdgeFunctionsPanel() {
  const [hours, setHours] = useState('24');
  const h = parseInt(hours, 10);
  const { data, isLoading, refetch, isFetching } = useEdgeFunctionsStats(h);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Select value={hours} onValueChange={setHours} dir="rtl">
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">آخر ساعة</SelectItem>
            <SelectItem value="24">آخر 24 ساعة</SelectItem>
            <SelectItem value="168">آخر أسبوع</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4" /> استدعاءات Edge Functions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-6 text-muted-foreground">جاري التحميل...</p>
          ) : !data || data.functions.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-muted-foreground">لم يُسجَّل أي استدعاء موسوم بـ function في هذه الفترة.</p>
              <p className="text-xs text-muted-foreground">
                لتفعيل التتبع، أضف <code className="bg-muted px-1 rounded">metadata.function</code> عند تسجيل الأحداث.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-right text-muted-foreground text-xs">
                    <th className="py-2 pr-2">الدالة</th>
                    <th className="py-2">الاستدعاءات</th>
                    <th className="py-2">الأخطاء</th>
                    <th className="py-2">نسبة الفشل</th>
                    <th className="py-2">متوسط الزمن</th>
                  </tr>
                </thead>
                <tbody>
                  {data.functions.map((f) => {
                    const rate = f.total > 0 ? (f.errors / f.total) * 100 : 0;
                    const rateColor = rate >= 20 ? 'destructive' : rate >= 5 ? 'default' : 'outline';
                    return (
                      <tr key={f.function_name} className="border-b last:border-0">
                        <td className="py-2 pr-2 font-mono text-xs">{f.function_name}</td>
                        <td className="py-2">{f.total}</td>
                        <td className="py-2">{f.errors}</td>
                        <td className="py-2"><Badge variant={rateColor}>{rate.toFixed(1)}%</Badge></td>
                        <td className="py-2 text-muted-foreground">{f.avg_ms ? `${f.avg_ms}ms` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
