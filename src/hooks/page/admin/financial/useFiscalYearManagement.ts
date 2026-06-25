/**
 * هوك منطق إدارة السنوات المالية — حالة الإدخال + استعلام.
 * إجراءات mutation مستخرجة في useFiscalYearActions.
 */
import { useMemo, useState } from 'react';
import { useFiscalYears } from '@/hooks/data/financial/fiscalYears/useFiscalYears';
import { validateFiscalYearInput } from '@/lib/services';
import { useFiscalYearActions } from './useFiscalYearActions';

export function useFiscalYearManagement() {
  const { data: fiscalYears = [], isLoading } = useFiscalYears();
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

  const actions = useFiscalYearActions({
    fiscalYears, newFY, formError,
    setActionLoading, setSubmitError, setNewFY, setCreating,
  });

  return {
    fiscalYears, isLoading,
    creating, setCreating,
    newFY, setNewFY,
    actionLoading,
    formError, submitError,
    ...actions,
  };
}
