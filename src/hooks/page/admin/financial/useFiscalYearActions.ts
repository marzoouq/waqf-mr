/**
 * معالجات إجراءات السنوات المالية — مستخرجة من useFiscalYearManagement.
 * كل دالة تدير setActionLoading و invalidation و toast فقط، بدون حالة UI.
 */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { uiNotify } from '@/lib/notify';
import {
  createFiscalYear,
  reopenFiscalYear,
  toggleFiscalYearPublished,
  deleteFiscalYear as deleteFY,
  deleteFiscalYearCascade,
} from '@/lib/services';
import { fiscalYearKeys } from '@/lib/queryKeys/fiscalYearKeys';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { safeSessionGet, safeSessionRemove, safeSessionSet } from '@/lib/storage';
import type { FiscalYear } from '@/hooks/data/financial/fiscalYears/useFiscalYears';

/** queryKeys التي تتأثر بتغيير حالة النشر لسنة مالية. */
const PUBLISH_INVALIDATION_KEYS: readonly (readonly string[])[] = [
  fiscalYearKeys.prefixes.all,
  fiscalYearKeys.prefixes.publishedAll,
  ['public-stats'],
  ['annual_report_status'],
  ['annual_report_items'],
  ['waqif_annual_report'],
];

/** إذا كانت السنة المحذوفة هي المختارة، يستبدلها بأقرب active متاحة أو يمسحها. */
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

interface Params {
  fiscalYears: readonly FiscalYear[];
  newFY: { label: string; start_date: string; end_date: string };
  formError: string | null;
  setActionLoading: (v: string | null) => void;
  setSubmitError: (v: string | null) => void;
  setNewFY: (v: { label: string; start_date: string; end_date: string }) => void;
  setCreating: (v: boolean) => void;
}

export function useFiscalYearActions(params: Params) {
  const { fiscalYears, newFY, formError, setActionLoading, setSubmitError, setNewFY, setCreating } = params;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleCreate = useCallback(async () => {
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
      queryClient.invalidateQueries({ queryKey: fiscalYearKeys.prefixes.all });
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
  }, [newFY, formError, queryClient, setActionLoading, setSubmitError, setNewFY, setCreating]);

  const handleClose = useCallback(async (fy: FiscalYear) => {
    if (fy.status !== 'active') return;
    uiNotify.warning(
      'لإقفال السنة المالية بشكل صحيح مع حفظ الحساب الختامي وترحيل الرصيد، يرجى استخدام صفحة "الحسابات الختامية".',
      { duration: 6000, action: { label: 'فتح الحسابات', onClick: () => navigate('/dashboard/accounts') } },
    );
  }, [navigate]);

  const handleReopen = useCallback(async (fy: FiscalYear, reason: string) => {
    setActionLoading(fy.id);
    try {
      const data = await reopenFiscalYear(fy.id, reason);
      queryClient.invalidateQueries({ queryKey: fiscalYearKeys.prefixes.all });
      uiNotify.success(`تم إعادة فتح السنة: ${data.label}`);
    } catch (err: unknown) {
      uiNotify.error(err instanceof Error ? err.message : 'حدث خطأ أثناء إعادة الفتح');
    } finally {
      setActionLoading(null);
    }
  }, [queryClient, setActionLoading]);

  const togglePublished = useCallback(async (fy: FiscalYear) => {
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
  }, [queryClient, setActionLoading]);

  const handleDelete = useCallback(async (fy: FiscalYear) => {
    if (fy.status === 'active') {
      uiNotify.error('لا يمكن حذف سنة نشطة بالحذف العادي — استخدم "حذف السنة وكل بياناتها"');
      return;
    }
    setActionLoading(fy.id);
    try {
      await deleteFY(fy.id);
      queryClient.invalidateQueries({ queryKey: fiscalYearKeys.prefixes.all });
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
  }, [fiscalYears, queryClient, setActionLoading]);

  const handleCascadeDelete = useCallback(async (fy: FiscalYear) => {
    setActionLoading(fy.id);
    try {
      const res = await deleteFiscalYearCascade(fy.id);
      cleanupSelectedFiscalYearIfDeleted(fy.id, fiscalYears);
      queryClient.invalidateQueries({ queryKey: fiscalYearKeys.prefixes.all });
      queryClient.invalidateQueries();
      const total = Object.values(res?.deleted ?? {}).reduce((a, b) => a + (b || 0), 0);
      uiNotify.success(`تم حذف السنة "${fy.label}" وكل بياناتها (${total} سجل)`);
    } catch (err: unknown) {
      uiNotify.error(err instanceof Error ? err.message : 'حدث خطأ أثناء الحذف الشامل');
    } finally {
      setActionLoading(null);
    }
  }, [fiscalYears, queryClient, setActionLoading]);

  return { handleCreate, handleClose, handleReopen, togglePublished, handleDelete, handleCascadeDelete };
}
