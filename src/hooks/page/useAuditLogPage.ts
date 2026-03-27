/**
 * هوك منطق صفحة سجل المراجعة
 */
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_MESSAGING } from '@/lib/queryStaleTime';
import { useAuditLog, getTableNameAr, getOperationNameAr } from '@/hooks/data/useAuditLog';
import { generateAuditLogPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/data/usePdfWaqfInfo';
import { toast } from 'sonner';

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

  const { data: todayCount = 0 } = useQuery({
    queryKey: ['audit_log_today_count'],
    staleTime: 30_000,
    queryFn: async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStr);
      return count ?? 0;
    },
  });

  const toggleRow = useCallback((id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleExportPdf = async () => {
    if (logs.length === 0) { toast.error('لا توجد سجلات للتصدير'); return; }
    setExporting(true);
    try {
      let exportQuery = supabase
        .from('audit_log')
        .select('id, table_name, operation, record_id, old_data, new_data, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (tableFilter !== 'all') exportQuery = exportQuery.eq('table_name', tableFilter);
      if (opFilter !== 'all') exportQuery = exportQuery.eq('operation', opFilter);
      if (dateFrom) exportQuery = exportQuery.gte('created_at', dateFrom);
      if (dateTo) exportQuery = exportQuery.lte('created_at', dateTo + 'T23:59:59');
      const { data: allLogs } = await exportQuery;
      await generateAuditLogPDF({
        logs: (allLogs as unknown as typeof logs) || logs,
        waqfInfo, tableFilter, opFilter,
      });
      toast.success('تم تصدير سجل المراجعة بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير التقرير');
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
