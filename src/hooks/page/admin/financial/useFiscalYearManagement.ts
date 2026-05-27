/**
 * هوك منطق إدارة السنوات المالية
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { uiNotify } from '@/lib/notify';
import { useFiscalYears, type FiscalYear } from '@/hooks/data/financial/useFiscalYears';
import { createFiscalYear, reopenFiscalYear, toggleFiscalYearPublished, deleteFiscalYear as deleteFY, deleteFiscalYearCascade } from '@/lib/services';

export function useFiscalYearManagement() {
  const { data: fiscalYears = [], isLoading } = useFiscalYears();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [newFY, setNewFY] = useState({ label: '', start_date: '', end_date: '' });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newFY.label || !newFY.start_date || !newFY.end_date) {
      uiNotify.error('يرجى تعبئة جميع الحقول');
      return;
    }
    setActionLoading('create');
    try {
      await createFiscalYear(newFY);
      queryClient.invalidateQueries({ queryKey: ['fiscal_years'] });
      uiNotify.success('تم إنشاء السنة المالية (محجوبة عن المستفيدين — يمكنك نشرها لاحقاً)');
      setNewFY({ label: '', start_date: '', end_date: '' });
    } catch (err: unknown) {
      uiNotify.error(err instanceof Error ? err.message : 'حدث خطأ أثناء الإنشاء');
    } finally {
      setActionLoading(null);
      setCreating(false);
    }
  };

  const handleClose = async (fy: FiscalYear) => {
    if (fy.status !== 'active') return;
    uiNotify.warning('لإقفال السنة المالية بشكل صحيح مع حفظ الحساب الختامي وترحيل الرصيد، يرجى استخدام صفحة "الحسابات الختامية".', {
      duration: 6000,
      action: { label: 'فتح الحسابات', onClick: () => navigate('/dashboard/accounts') },
    });
  };

  const handleReopen = async (fy: FiscalYear, reason: string) => {
    setActionLoading(fy.id);
    try {
      const data = await reopenFiscalYear(fy.id, reason);
      queryClient.invalidateQueries({ queryKey: ['fiscal_years'] });
      uiNotify.success(`تم إعادة فتح السنة: ${data.label}`);
    } catch (err: unknown) {
      uiNotify.error(err instanceof Error ? err.message : 'حدث خطأ أثناء إعادة الفتح');
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
      uiNotify.success(newVal ? `تم نشر السنة "${fy.label}" للمستفيدين` : `تم حجب السنة "${fy.label}" عن المستفيدين`);
    } catch {
      uiNotify.error('حدث خطأ أثناء تحديث حالة النشر');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (fy: FiscalYear) => {
    if (fy.status === 'active') {
      uiNotify.error('لا يمكن حذف سنة نشطة بالحذف العادي — استخدم "حذف السنة وكل بياناتها"');
      return;
    }
    setActionLoading(fy.id);
    try {
      await deleteFY(fy.id);
      queryClient.invalidateQueries({ queryKey: ['fiscal_years'] });
      uiNotify.success(`تم حذف السنة: ${fy.label}`);
    } catch (err: unknown) {
      uiNotify.error(
        err instanceof Error && err.message?.includes('violates foreign key')
          ? 'لا يمكن حذف سنة مرتبطة ببيانات مالية — استخدم "حذف السنة وكل بياناتها"'
          : 'حدث خطأ أثناء الحذف',
      );
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * حذف السنة وكل البيانات المرتبطة (للناظر فقط).
   * يستخدم دالة قاعدة بيانات آمنة.
   */
  const handleCascadeDelete = async (fy: FiscalYear) => {
    setActionLoading(fy.id);
    try {
      const res = await deleteFiscalYearCascade(fy.id);
      queryClient.invalidateQueries({ queryKey: ['fiscal_years'] });
      queryClient.invalidateQueries();
      const total = Object.values(res?.deleted ?? {}).reduce((a, b) => a + (b || 0), 0);
      uiNotify.success(`تم حذف السنة "${fy.label}" وكل بياناتها (${total} سجل)`);
    } catch (err: unknown) {
      uiNotify.error(err instanceof Error ? err.message : 'حدث خطأ أثناء الحذف الشامل');
    } finally {
      setActionLoading(null);
    }
  };

  return {
    fiscalYears, isLoading,
    creating, setCreating,
    newFY, setNewFY,
    actionLoading,
    handleCreate, handleClose, handleReopen, togglePublished, handleDelete, handleCascadeDelete,
  };
}
