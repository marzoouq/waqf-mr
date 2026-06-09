/**
 * هوك منطق إدارة السنوات المالية
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { uiNotify } from '@/lib/notify';
import { useFiscalYears, type FiscalYear } from '@/hooks/data/financial/fiscalYears/useFiscalYears';
import { createFiscalYear, reopenFiscalYear, toggleFiscalYearPublished, deleteFiscalYear as deleteFY, deleteFiscalYearCascade, validateFiscalYearInput } from '@/lib/services';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { safeSessionGet, safeSessionRemove, safeSessionSet } from '@/lib/storage';
import { fiscalYearKeys } from '@/lib/queryKeys/fiscalYearKeys';

/** قائمة queryKeys التي تتأثر بتغيير حالة النشر لسنة مالية. */
const PUBLISH_INVALIDATION_KEYS: readonly (readonly string[])[] = [
  fiscalYearKeys.prefixes.all,
  fiscalYearKeys.prefixes.publishedAll,
  ['public-stats'],
  ['annual_report_status'],
  ['annual_report_items'],
  ['waqif_annual_report'],
];

/**
 * إذا كانت السنة المحذوفة هي المختارة حالياً في sessionStorage،
 * يستبدلها بأول سنة active متاحة، أو يمسحها تماماً.
 */
const cleanupSelectedFiscalYearIfDeleted = (
  deletedId: string,
  remaining: readonly FiscalYear[],
) => {
  const currentSelected = safeSessionGet(STORAGE_KEYS.FISCAL_YEAR, '');
  if (currentSelected !== deletedId) return;
  const fallback = remaining.find(fy => fy.id !== deletedId && fy.status === 'active')
    ?? remaining.find(fy => fy.id !== deletedId);
  if (fallback) safeSessionSet(STORAGE_KEYS.FISCAL_YEAR, fallback.id);
  else safeSessionRemove(STORAGE_KEYS.FISCAL_YEAR);
};

export function useFiscalYearManagement() {
  const { data: fiscalYears = [], isLoading } = useFiscalYears();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [newFY, setNewFY] = useState({ label: '', start_date: '', end_date: '' });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /** تحقق محلي فوري — يعود null عند صلاحية الإدخال */
  const formError = useMemo<string | null>(() => {
    if (!newFY.label && !newFY.start_date && !newFY.end_date) return null;
    return validateFiscalYearInput(newFY);
  }, [newFY]);

  /** مسح خطأ الخادم عند أي تغيير في الحقول — adjust state during render */
  const [prevFY, setPrevFY] = useState(newFY);
  if (prevFY !== newFY) {
    setPrevFY(newFY);
    if (submitError !== null) setSubmitError(null);
  }

  const handleCreate = async () => {
    if (!newFY.label || !newFY.start_date || !newFY.end_date) {
      const msg = 'يرجى تعبئة جميع الحقول';
      setSubmitError(msg);
      uiNotify.error(msg);
      return;
    }
    if (formError) {
      setSubmitError(formError);
      uiNotify.error(formError);
      return;
    }
    setActionLoading('create');
    try {
      await createFiscalYear(newFY);
      queryClient.invalidateQueries({ queryKey: ['fiscal_years'] });
      uiNotify.success('تم إنشاء السنة المالية (محجوبة عن المستفيدين — يمكنك نشرها لاحقاً)');
      setNewFY({ label: '', start_date: '', end_date: '' });
      setSubmitError(null);
      setCreating(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء الإنشاء';
      setSubmitError(msg);
      uiNotify.error(msg);
    } finally {
      setActionLoading(null);
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
      PUBLISH_INVALIDATION_KEYS.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [...key] });
      });
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
      cleanupSelectedFiscalYearIfDeleted(fy.id, fiscalYears);
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
      cleanupSelectedFiscalYearIfDeleted(fy.id, fiscalYears);
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
    formError, submitError,
    handleCreate, handleClose, handleReopen, togglePublished, handleDelete, handleCascadeDelete,
  };
}
