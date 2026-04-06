/**
 * هوك منطق صفحة سجل المراجعة
 */
import { useState, useCallback } from 'react';
import { useAuditLog, getTableNameAr, getOperationNameAr } from '@/hooks/data/audit/useAuditLog';
import { useAuditLogTodayCount, fetchAuditLogForExport } from '@/hooks/data/audit/useAuditLogStats';
import { generateAuditLogPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { defaultNotify } from '@/lib/notify';

const ITEMS_PER_PAGE = 15;

export function useAuditLogPage() {
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [opFilter, setOpFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('operations');
  const [exporting, setExporting] = useState(false);
  
  const waqfInfo = usePdfWaqfInfo();
  const hasDateFilter = dateFrom !== '' || dateTo !== '';

  const clearDateFilters = () => { setDateFrom(''); setDateTo(''); setCurrentPage(1); };

  const { data: auditData, isLoading } = useAuditLog({
    tableName: tableFilter !== 'all' ? tableFilter : undefined,
    operation: opFilter !== 'all' ? opFilter : undefined,
    searchQuery: searchQuery || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page: currentPage,
    pageSize: ITEMS_PER_PAGE,
  });

  const logs = auditData?.logs ?? [];
  const totalCount = auditData?.totalCount ?? 0;

  const { data: todayCount = 0 } = useAuditLogTodayCount();

  const toggleRow = useCallback((id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleExportPdf = async () => {
    if (logs.length === 0) { defaultNotify.error('لا توجد سجلات للتصدير'); return; }
    setExporting(true);
    try {
      const allLogs = await fetchAuditLogForExport({ tableFilter, opFilter, dateFrom, dateTo });
      await generateAuditLogPDF({
        logs: allLogs.length > 0 ? allLogs : logs,
        waqfInfo, tableFilter, opFilter,
      });
      defaultNotify.success('تم تصدير سجل المراجعة بنجاح');
    } catch {
      defaultNotify.error('حدث خطأ أثناء تصدير التقرير');
    } finally {
      setExporting(false);
    }
  };

  const getSummary = useCallback((log: typeof logs[0]) => {
    return log.operation === 'INSERT'
      ? `إضافة سجل جديد في ${getTableNameAr(log.table_name)}`
      : log.operation === 'DELETE'
        ? `حذف سجل من ${getTableNameAr(log.table_name)}`
        : log.operation === 'REOPEN'
          ? `إعادة فتح ${getTableNameAr(log.table_name)}`
          : `تعديل سجل في ${getTableNameAr(log.table_name)}`;
  }, []);

  return {
    tableFilter, setTableFilter, opFilter, setOpFilter,
    searchQuery, setSearchQuery,
    dateFrom, setDateFrom, dateTo, setDateTo,
    currentPage, setCurrentPage,
    expandedRows, toggleRow,
    activeTab, setActiveTab,
    exporting, hasDateFilter, clearDateFilters,
    isLoading, logs, totalCount, todayCount,
    handleExportPdf, getSummary,
    ITEMS_PER_PAGE,
  };
}

export { getTableNameAr, getOperationNameAr };
