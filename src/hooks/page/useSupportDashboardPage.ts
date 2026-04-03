/**
 * هوك منطق صفحة لوحة تحكم الدعم الفني
 */
import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/auth/useAuthContext';
import {
  useSupportTickets, useSupportStats, useSupportAnalytics,
  useClientErrors, fetchTicketsForExport,
  type SupportTicket,
} from '@/hooks/data/support/useSupportTickets';
import { toast } from 'sonner';
import { fmtDate } from '@/utils/format';

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: 'منخفض', color: 'bg-muted text-muted-foreground' },
  medium: { label: 'متوسط', color: 'bg-warning/20 text-warning' },
  high: { label: 'عالي', color: 'bg-caution/20 text-caution-foreground' },
  critical: { label: 'حرج', color: 'bg-destructive/20 text-destructive' },
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open: { label: 'مفتوح', color: 'bg-status-approved/20 text-status-approved-foreground' },
  in_progress: { label: 'قيد المعالجة', color: 'bg-warning/20 text-warning' },
  resolved: { label: 'تم الحل', color: 'bg-success/20 text-success' },
  closed: { label: 'مغلق', color: 'bg-muted text-muted-foreground' },
};

const CATEGORY_MAP: Record<string, string> = {
  general: 'عام', technical: 'تقني', financial: 'مالي', account: 'حساب', suggestion: 'اقتراح',
};

async function exportToCsv(filename: string, headers: string[], rows: string[][]) {
  const { buildCsvFromRows, downloadCsv } = await import('@/utils/csv');
  const csv = buildCsvFromRows(headers, rows);
  downloadCsv(csv, filename);
  toast.success(`تم تصدير ${rows.length} سجل`);
}

export function useSupportDashboardPage() {
  const { role } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: ticketsData, isLoading } = useSupportTickets(statusFilter);
  const tickets = useMemo(() => ticketsData?.tickets ?? [], [ticketsData?.tickets]);
  const { data: stats } = useSupportStats();
  const { data: analytics } = useSupportAnalytics();
  const { data: errors = [] } = useClientErrors();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [errorSearch, setErrorSearch] = useState('');

  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (categoryFilter !== 'all') result = result.filter(t => t.category === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.ticket_number.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q));
    }
    return result;
  }, [tickets, categoryFilter, searchQuery]);

  const filteredErrors = useMemo(() => {
    if (!errorSearch.trim()) return errors;
    const q = errorSearch.trim().toLowerCase();
    return errors.filter(err => {
      const meta = err.metadata as Record<string, string> | null;
      return (err.target_path ?? '').toLowerCase().includes(q) || (meta?.error_name ?? '').toLowerCase().includes(q) || (meta?.error_message ?? '').toLowerCase().includes(q);
    });
  }, [errors, errorSearch]);

  /** تصدير التذاكر — جلب عند الطلب من قاعدة البيانات */
  const handleExportTickets = useCallback(async () => {
    try {
      const rows = await fetchTicketsForExport();
      const headers = ['الرقم', 'العنوان', 'التصنيف', 'الأولوية', 'الحالة', 'التاريخ'];
      const csvRows = rows.map(t => [
        t.ticket_number, t.title, CATEGORY_MAP[t.category] || t.category,
        PRIORITY_MAP[t.priority]?.label || t.priority, STATUS_MAP[t.status]?.label || t.status,
        fmtDate(t.created_at),
      ]);
      await exportToCsv('support-tickets.csv', headers, csvRows);
    } catch {
      toast.error('فشل تصدير التذاكر');
    }
  }, []);

  const handleExportErrors = useCallback(() => {
    const headers = ['التاريخ', 'الصفحة', 'الخطأ', 'المتصفح'];
    const rows = filteredErrors.map(err => {
      const meta = err.metadata as Record<string, string> | null;
      return [
        new Date(err.created_at).toLocaleString('ar-SA'), err.target_path ?? '',
        `${meta?.error_name ?? ''}: ${meta?.error_message ?? ''}`, (meta?.user_agent ?? '').slice(0, 80),
      ];
    });
    exportToCsv('client-errors.csv', headers, rows);
  }, [filteredErrors]);

  // إحصائيات من RPC بدلاً من حساب في الواجهة
  const categoryStats = useMemo(() => {
    if (!analytics?.category_stats) return [];
    const total = analytics.total_count || 1;
    return analytics.category_stats.map(s => ({
      key: s.key,
      label: CATEGORY_MAP[s.key] || s.key,
      count: s.count,
      pct: Math.round((s.count / total) * 100),
    }));
  }, [analytics]);

  const priorityStats = useMemo(() => {
    if (!analytics?.priority_stats) return [];
    const total = analytics.total_count || 1;
    return analytics.priority_stats.map(s => ({
      key: s.key,
      label: PRIORITY_MAP[s.key]?.label || s.key,
      color: PRIORITY_MAP[s.key]?.color || '',
      count: s.count,
      pct: Math.round((s.count / total) * 100),
    }));
  }, [analytics]);

  const avgResolutionTime = useMemo(() => {
    if (!analytics?.avg_resolution_hours) return null;
    const avg = analytics.avg_resolution_hours;
    if (avg < 1) return `${Math.round(avg * 60)} دقيقة`;
    if (avg < 24) return `${Math.round(avg)} ساعة`;
    return `${Math.round(avg / 24)} يوم`;
  }, [analytics]);

  const avgRating = useMemo(() => {
    if (!analytics?.rated_count) return null;
    return { avg: String(analytics.avg_rating), count: analytics.rated_count };
  }, [analytics]);

  return {
    role, isLoading, stats,
    // فلاتر
    statusFilter, setStatusFilter, categoryFilter, setCategoryFilter,
    searchQuery, setSearchQuery, errorSearch, setErrorSearch,
    // بيانات
    filteredTickets, filteredErrors,
    // تذكرة مختارة
    selectedTicket, setSelectedTicket,
    showNewTicket, setShowNewTicket,
    // تصدير
    handleExportTickets, handleExportErrors,
    // إحصائيات
    categoryStats, priorityStats, avgResolutionTime, avgRating,
  };
}

export { PRIORITY_MAP, STATUS_MAP, CATEGORY_MAP };
