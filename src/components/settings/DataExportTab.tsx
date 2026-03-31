/**
 * تبويب تصدير البيانات (CSV + Excel)
 * يتيح للناظر تصدير بيانات أي جدول بصيغة CSV أو Excel
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Database, Loader2, FileSpreadsheet } from 'lucide-react';
import { useDataExport } from '@/hooks/page/useDataExport';

const DataExportTab = () => {
  const { exporting, format, setFormat, handleExport, handleExportAll, tables } = useDataExport();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Database className="w-5 h-5" />
            تصدير البيانات
          </CardTitle>
          <CardDescription>تصدير بيانات النظام بصيغة CSV أو Excel لاستخدامها في جداول البيانات أو حفظها كنسخة احتياطية</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* اختيار الصيغة */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">صيغة التصدير:</span>
            <div className="flex gap-1 rounded-lg border p-1">
              <Button
                variant={format === 'xlsx' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFormat('xlsx')}
                className="gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Excel
              </Button>
              <Button
                variant={format === 'csv' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFormat('csv')}
                className="gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </Button>
            </div>
          </div>

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
