/**
 * جدول التفاعلات — تبويبات، أزرار بدون handler، تكرارات، نقص aria.
 */
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getInteractionsRows, type InteractionsAuditRow } from '@/lib/diagnostics/checks/interactions';
import { logger } from '@/lib/logger';

const TYPE_LABEL: Record<InteractionsAuditRow['type'], string> = {
  tabs: 'تبويبات',
  handler_less_button: 'زر بدون معالج',
  duplicate_tab_id: 'تبويب مكرّر',
  missing_aria: 'نقص aria',
};

const SEV_VARIANT: Record<InteractionsAuditRow['severity'], string> = {
  pass: 'text-success',
  warn: 'text-warning',
  fail: 'text-destructive',
  info: 'text-info',
};

export default function InteractionsTable() {
  const [rows, setRows] = useState<InteractionsAuditRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    return getInteractionsRows()
      .then(r => setRows(r))
      .catch(e => logger.warn('[InteractionsTable]', e))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    getInteractionsRows()
      .then(r => { if (active) setRows(r); })
      .catch(e => logger.warn('[InteractionsTable]', e));
    return () => { active = false; };
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">جرد التفاعلات في كل الصفحات</CardTitle>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="text-xs px-2 py-1 border rounded-md hover:bg-muted disabled:opacity-50"
        >
          {loading ? 'جارٍ...' : 'إعادة المسح'}
        </button>
      </CardHeader>
      <CardContent>
        {!rows && <p className="text-sm text-muted-foreground">جارٍ المسح...</p>}
        {rows && rows.length === 0 && <p className="text-sm text-success">لا توجد ملاحظات — كل التفاعلات سليمة.</p>}
        {rows && rows.length > 0 && (
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصفحة</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>التفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{r.file}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={SEV_VARIANT[r.severity]}>{TYPE_LABEL[r.type]}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
