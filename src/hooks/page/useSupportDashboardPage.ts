/**
 * هوك منطق صفحة لوحة تحكم الدعم الفني
 */
import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/auth/useAuthContext';
import {
  useSupportTickets, useSupportStats, useSupportAnalytics,
  useClientErrors, type SupportTicket,
} from '@/hooks/data/useSupportTickets';
import { toast } from 'sonner';

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
  const { data: allTickets = [] } = useSupportAnalytics();
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

  const handleExportTickets = useCallback(() => {
    const headers = ['الرقم', 'العنوان', 'التصنيف', 'الأولوية', 'الحالة', 'التاريخ'];
    const source = allTickets.length > 0 ? allTickets : filteredTickets;
    const rows = source.map(t => [
      t.ticket_number, t.title, CATEGORY_MAP[t.category] || t.category,
      PRIORITY_MAP[t.priority]?.label || t.priority, STATUS_MAP[t.status]?.label || t.status,
      new Date(t.created_at).toLocaleDateString('ar-SA'),
    ]);
    exportToCsv('support-tickets.csv', headers, rows);
  }, [allTickets, filteredTickets]);

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

  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    allTickets.forEach(t => { map[t.category] = (map[t.category] || 0) + 1; });
    return Object.entries(map).map(([key, count]) => ({
      key, label: CATEGORY_MAP[key] || key, count,
      pct: allTickets.length > 0 ? Math.round((count / allTickets.length) * 100) : 0,
    }));
  }, [allTickets]);

  const priorityStats = useMemo(() => {
    const map: Record<string, number> = {};
    allTickets.forEach(t => { map[t.priority] = (map[t.priority] || 0) + 1; });
    return Object.entries(map).map(([key, count]) => ({
      key, label: PRIORITY_MAP[key]?.label || key, color: PRIORITY_MAP[key]?.color || '',
      count, pct: allTickets.length > 0 ? Math.round((count / allTickets.length) * 100) : 0,
    }));
  }, [allTickets]);

  const avgResolutionTime = useMemo(() => {
    const resolved = allTickets.filter(t => t.resolved_at);
    if (resolved.length === 0) return null;
    const totalHours = resolved.reduce((sum, t) => {
      return sum + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
    }, 0);
    const avg = totalHours / resolved.length;
    if (avg < 1) return `${Math.round(avg * 60)} دقيقة`;
    if (avg < 24) return `${Math.round(avg)} ساعة`;
    return `${Math.round(avg / 24)} يوم`;
  }, [allTickets]);

  const avgRating = useMemo(() => {
    const rated = allTickets.filter(t => t.rating);
    if (rated.length === 0) return null;
    const total = rated.reduce((sum, t) => sum + (t.rating ?? 0), 0);
    return { avg: (total / rated.length).toFixed(1), count: rated.length };
  }, [allTickets]);

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
