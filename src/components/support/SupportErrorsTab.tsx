/**
 * تبويب الأخطاء التلقائية
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bug, CheckCircle, Search, Download } from 'lucide-react';

interface AccessLogEntry {
  id: string;
  created_at: string;
  target_path: string | null;
  metadata: Record<string, unknown> | null;
}

interface SupportErrorsTabProps {
  filteredErrors: AccessLogEntry[];
  errorSearch: string;
  setErrorSearch: (v: string) => void;
  onExport: () => void;
}

export default function SupportErrorsTab({ filteredErrors, errorSearch, setErrorSearch, onExport }: SupportErrorsTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-destructive" />
            سجل الأخطاء التلقائية
            <span className="text-sm font-normal text-muted-foreground">({filteredErrors.length})</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-2.5 top-2.5 text-muted-foreground" />
              <Input placeholder="بحث في الأخطاء..." value={errorSearch} onChange={e => setErrorSearch(e.target.value)} className="pr-8 w-[180px]" />
            </div>
            <Button size="sm" variant="outline" onClick={onExport} disabled={filteredErrors.length === 0}>
              <Download className="w-4 h-4 ml-1" />
              تصدير
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredErrors.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-2" />
            <p className="text-muted-foreground">
              {errorSearch ? 'لا توجد أخطاء مطابقة للبحث' : 'لا توجد أخطاء مسجلة — التطبيق يعمل بشكل سليم'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">الصفحة</TableHead>
                <TableHead className="text-right">الخطأ</TableHead>
                <TableHead className="text-right">المتصفح</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredErrors.map(err => {
                const meta = err.metadata;
                return (
                  <TableRow key={err.id}>
                    <TableCell className="text-xs">{new Date(err.created_at).toLocaleString('ar-SA')}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[150px] truncate" dir="ltr">{err.target_path || '—'}</TableCell>
                    <TableCell className="max-w-[250px]">
                      <div className="text-xs text-destructive font-mono truncate" dir="ltr">
                        {meta?.error_name}: {meta?.error_message}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate" dir="ltr">
                      {meta?.user_agent?.slice(0, 50) || '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
