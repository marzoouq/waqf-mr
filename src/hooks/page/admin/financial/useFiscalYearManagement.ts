/**
 * هوك منطق إدارة السنوات المالية
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { defaultNotify } from '@/lib/notify';
import { useFiscalYears, type FiscalYear } from '@/hooks/data/financial/useFiscalYears';
import { createFiscalYear, reopenFiscalYear, toggleFiscalYearPublished, deleteFiscalYear as deleteFY } from '@/lib/services';

export function useFiscalYearManagement() {
  const { data: fiscalYears = [], isLoading } = useFiscalYears();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [newFY, setNewFY] = useState({ label: '', start_date: '', end_date: '' });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newFY.label || !newFY.start_date || !newFY.end_date) {
      defaultNotify.error('يرجى تعبئة جميع الحقول');
      return;
    }
    setActionLoading('create');
    try {
      await createFiscalYear(newFY);
      queryClient.invalidateQueries({ queryKey: ['fiscal_years'] });
      defaultNotify.success('تم إنشاء السنة المالية (محجوبة عن المستفيدين — يمكنك نشرها لاحقاً)');
      setNewFY({ label: '', start_date: '', end_date: '' });
    } catch (err: unknown) {
      defaultNotify.error(err instanceof Error ? err.message : 'حدث خطأ أثناء الإنشاء');
    } finally {
      setActionLoading(null);
      setCreating(false);
    }
  };

  const handleClose = async (fy: FiscalYear) => {
    if (fy.status !== 'active') return;
    defaultNotify.warning('لإقفال السنة المالية بشكل صحيح مع حفظ الحساب الختامي وترحيل الرصيد، يرجى استخدام صفحة "الحسابات الختامية".', {
      duration: 6000,
      action: { label: 'فتح الحسابات', onClick: () => navigate('/dashboard/accounts') },
    });
  };

  const handleReopen = async (fy: FiscalYear, reason: string) => {
    setActionLoading(fy.id);
    try {
      const data = await reopenFiscalYear(fy.id, reason);
      queryClient.invalidateQueries({ queryKey: ['fiscal_years'] });
      defaultNotify.success(`تم إعادة فتح السنة: ${data.label}`);
    } catch (err: unknown) {
      defaultNotify.error(err instanceof Error ? err.message : 'حدث خطأ أثناء إعادة الفتح');
    } finally {
      setActionLoading(null);
    }
  };

  const togglePublished = async (fy: FiscalYear) => {
    const newVal = !fy.published;
    setActionLoading(`pub-${fy.id}`);
    try {
      await toggleFiscalYearPublished(fy.id, newVal);
      queryClient.invalidateQueries({ queryKey: ['fiscal_years'] });
      defaultNotify.success(newVal ? `تم نشر السنة "${fy.label}" للمستفيدين` : `تم حجب السنة "${fy.label}" عن المستفيدين`);
    } catch {
      defaultNotify.error('حدث خطأ أثناء تحديث حالة النشر');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (fy: FiscalYear) => {
    if (fy.status === 'active') {
      defaultNotify.error('لا يمكن حذف سنة نشطة — أقفلها أولاً قبل الحذف');
      return;
    }
    setActionLoading(fy.id);
    try {
      await deleteFY(fy.id);
      queryClient.invalidateQueries({ queryKey: ['fiscal_years'] });
      defaultNotify.success(`تم حذف السنة: ${fy.label}`);
    } catch (err: unknown) {
      defaultNotify.error(
        err instanceof Error && err.message?.includes('violates foreign key')
          ? 'لا يمكن حذف سنة مرتبطة ببيانات مالية'
          : 'حدث خطأ أثناء الحذف',
      );
    } finally {
      setActionLoading(null);
    }
  };

  return {
    fiscalYears, isLoading,
    creating, setCreating,
    newFY, setNewFY,
    actionLoading,
    handleCreate, handleClose, handleReopen, togglePublished, handleDelete,
  };
}
