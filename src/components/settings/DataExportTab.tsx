/**
 * تبويب تصدير البيانات (CSV)
 * يتيح للناظر تصدير بيانات أي جدول بصيغة CSV
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Database, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { toast } from 'sonner';
import { buildCsv, downloadCsv } from '@/utils/csv';

/** جلب بيانات الجدول مع استبعاد PII المشفر من المستفيدين */
async function fetchTableData(table: ExportableTable) {
  if (table === 'beneficiaries') {
    // استبعاد national_id و bank_account المشفرة
    const { data, error } = await supabase
      .from('beneficiaries')
      .select('id,name,email,phone,share_percentage,notes,created_at,updated_at')
      .limit(5000);
    return { data: data as unknown as Record<string, unknown>[] | null, error };
  }
  const { data, error } = await supabase.from(table).select('*').limit(5000);
  return { data: data as unknown as Record<string, unknown>[] | null, error };
}

const DataExportTab = () => {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (table: ExportableTable, label: string) => {
    setExporting(table);
    try {
      const { data, error } = await fetchTableData(table);
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.info(`لا توجد بيانات في جدول ${label}`);
        return;
      }
      if (data.length >= 5000) {
        toast.warning(`تنبيه: تم تصدير 5000 سجل فقط من ${label}. قد توجد بيانات إضافية لم تُصدَّر.`);
      }
      const csv = buildCsv(data);
      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(csv, `${table}_${date}.csv`);
      toast.success(`تم تصدير ${data.length} سجل من ${label}`);
    } catch {
      toast.error(`حدث خطأ أثناء تصدير ${label}`);
    } finally {
      setExporting(null);
    }
  };

  const handleExportAll = async () => {
    setExporting('all');
    const failedTables: string[] = [];
    try {
      for (const table of tables) {
        const { data, error } = await fetchTableData(table.key);
        if (error) { failedTables.push(table.label); continue; }
        if (data && data.length > 0) {
          const csv = buildCsv(data);
          const date = new Date().toISOString().slice(0, 10);
          downloadCsv(csv, `${table.key}_${date}.csv`);
        }
      }
      if (failedTables.length > 0) {
        toast.warning(`تعذر تصدير: ${failedTables.join('، ')}`);
      } else {
        toast.success('تم تصدير جميع البيانات بنجاح');
      }
    } catch {
      toast.error('حدث خطأ أثناء التصدير الشامل');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Database className="w-5 h-5" />
            تصدير البيانات
          </CardTitle>
          <CardDescription>تصدير بيانات النظام بصيغة CSV لاستخدامها في Excel أو حفظها كنسخة احتياطية</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleExportAll}
            disabled={exporting !== null}
            className="w-full gap-2 mb-4"
            variant="default"
          >
            {exporting === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            تصدير جميع الجداول
          </Button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tables.map(table => (
              <Button
                key={table.key}
                variant="outline"
                className="justify-start gap-3 h-auto py-3"
                disabled={exporting !== null}
                onClick={() => handleExport(table.key, table.label)}
              >
                {exporting === table.key ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="text-lg">{table.icon}</span>
                )}
                <div className="text-right">
                  <p className="text-sm font-medium">{table.label}</p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataExportTab;
