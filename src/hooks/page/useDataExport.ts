import { useState } from 'react';
import { toast } from 'sonner';
import { buildCsv, downloadCsv } from '@/utils/csv';
import { buildXlsx, downloadXlsx } from '@/utils/xlsx';
import { fetchTableData } from '@/lib/export/dataFetcher';

export type ExportableTable =
  | 'properties'
  | 'contracts'
  | 'income'
  | 'expenses'
  | 'beneficiaries'
  | 'accounts'
  | 'invoices'
  | 'distributions'
  | 'units'
  | 'fiscal_years'
  | 'tenant_payments';

export type ExportFormat = 'csv' | 'xlsx';

export const exportTables: { key: ExportableTable; label: string; icon: string }[] = [
  { key: 'properties', label: 'العقارات', icon: '🏢' },
  { key: 'units', label: 'الوحدات العقارية', icon: '🏠' },
  { key: 'contracts', label: 'العقود', icon: '📄' },
  { key: 'income', label: 'الدخل', icon: '💰' },
  { key: 'expenses', label: 'المصروفات', icon: '💸' },
  { key: 'beneficiaries', label: 'المستفيدين', icon: '👥' },
  { key: 'accounts', label: 'الحسابات الختامية', icon: '📊' },
  { key: 'invoices', label: 'الفواتير', icon: '🧾' },
  { key: 'distributions', label: 'التوزيعات', icon: '📋' },
  { key: 'fiscal_years', label: 'السنوات المالية', icon: '📅' },
  { key: 'tenant_payments', label: 'مدفوعات المستأجرين', icon: '💳' },
];

const fetchTableData = async (table: ExportableTable) => {
  if (table === 'beneficiaries') {
    // استبعاد national_id و bank_account المشفرة
    const { data, error } = await supabase
      .from('beneficiaries')
      .select('id,name,email,phone,share_percentage,notes,created_at,updated_at')
      .limit(5000);
    return { data: data as unknown as Record<string, unknown>[] | null, error };
  }

  // تحديد الأعمدة لكل جدول — استبعاد PII من contracts
  const contractColumns =
    'id, contract_number, tenant_name, property_id, unit_id, start_date, end_date, rent_amount, payment_type, payment_count, payment_amount, status, fiscal_year_id, created_at, updated_at';
  const selectCols = table === 'contracts' ? contractColumns : '*';
  const { data, error } = await supabase.from(table).select(selectCols).limit(5000);
  return { data: data as unknown as Record<string, unknown>[] | null, error };
};

export const useDataExport = () => {
  const [exporting, setExporting] = useState<string | null>(null);
  const [format, setFormat] = useState<ExportFormat>('xlsx');

  const exportData = (data: Record<string, unknown>[], filename: string) => {
    if (format === 'xlsx') {
      const blob = buildXlsx(data);
      downloadXlsx(blob, filename.replace('.csv', '.xlsx'));
    } else {
      const csv = buildCsv(data);
      downloadCsv(csv, filename);
    }
  };

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
      const date = new Date().toISOString().slice(0, 10);
      const ext = format === 'xlsx' ? 'xlsx' : 'csv';
      exportData(data, `${table}_${date}.${ext}`);
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
      for (const table of exportTables) {
        const { data, error } = await fetchTableData(table.key);
        if (error) {
          failedTables.push(table.label);
          continue;
        }
        if (data && data.length > 0) {
          const date = new Date().toISOString().slice(0, 10);
          const ext = format === 'xlsx' ? 'xlsx' : 'csv';
          exportData(data, `${table.key}_${date}.${ext}`);
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

  return {
    exporting,
    format,
    setFormat,
    handleExport,
    handleExportAll,
    tables: exportTables,
  };
};