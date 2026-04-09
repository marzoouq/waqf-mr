/**
 * هوك منطق نموذج العقد — الحالة والتحقق والخيارات
 */
import { useState, useMemo } from 'react';
import { useUnits } from '@/hooks/data/properties/useUnits';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { Contract } from '@/types/database';
import { emptyFormData, type ContractFormData } from '@/types/forms/contract';
import { defaultNotify } from '@/lib/notify';
import { SAUDI_NATIONAL_ID_REGEX, SA_VAT_REGEX } from '@/utils/validation/index';

interface UseContractFormDialogParams {
  editingContract: Contract | null;
  activeContracts: Contract[];
  onSubmit: (formData: ContractFormData, isEditing: boolean) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
  initialFormData?: ContractFormData;
}

export function useContractFormDialog({
  editingContract,
  activeContracts,
  onSubmit,
  onOpenChange,
  onReset,
  initialFormData,
}: UseContractFormDialogParams) {
  const [formData, setFormData] = useState<ContractFormData>(initialFormData || emptyFormData);
  const { data: propertyUnits = [] } = useUnits(formData.property_id || undefined);
  const { fiscalYears } = useFiscalYear();

  const [lastInitial, setLastInitial] = useState(initialFormData);
  if (initialFormData !== lastInitial) {
    setLastInitial(initialFormData);
    if (initialFormData) setFormData(initialFormData);
  }

  const occupiedUnitIds = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of activeContracts) {
      if (c.unit_id && c.status === 'active' && c.property_id === formData.property_id) {
        map.set(c.unit_id, c.tenant_name);
      }
    }
    return map;
  }, [activeContracts, formData.property_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contract_number || !formData.property_id || !formData.tenant_name || !formData.start_date || !formData.end_date) {
      defaultNotify.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (formData.rental_mode === 'multi') {
      if (formData.selected_unit_ids.length === 0) {
        defaultNotify.error('يرجى اختيار وحدة واحدة على الأقل');
        return;
      }
      if (formData.pricing_mode === 'per_unit') {
        const allFilled = formData.selected_unit_ids.every(id => parseFloat(formData.rent_per_unit[id] ?? '0') > 0);
        if (!allFilled) {
          defaultNotify.error('يرجى تحديد قيمة الإيجار لكل وحدة');
          return;
        }
      } else if (!formData.rent_amount || parseFloat(formData.rent_amount) <= 0) {
        defaultNotify.error('يرجى إدخال قيمة الإيجار الإجمالي');
        return;
      }
    } else if (!formData.rent_amount) {
      defaultNotify.error('يرجى إدخال قيمة الإيجار');
      return;
    }
    if (formData.tenant_id_number && formData.tenant_id_type === 'NAT' && !SAUDI_NATIONAL_ID_REGEX.test(formData.tenant_id_number)) {
      defaultNotify.error('رقم الهوية يجب أن يكون 10 أرقام ويبدأ بـ 1 أو 2');
      return;
    }
    if (formData.tenant_tax_number && !SA_VAT_REGEX.test(formData.tenant_tax_number)) {
      defaultNotify.error('الرقم الضريبي يجب أن يكون 15 رقماً ويبدأ وينتهي بـ 3');
      return;
    }
    await onSubmit(formData, !!editingContract);
    onOpenChange(false);
    setFormData(emptyFormData);
    onReset();
  };

  const toggleUnit = (unitId: string) => {
    setFormData(prev => {
      const ids = prev.selected_unit_ids.includes(unitId)
        ? prev.selected_unit_ids.filter(id => id !== unitId)
        : [...prev.selected_unit_ids, unitId];
      return { ...prev, selected_unit_ids: ids };
    });
  };

  const isMulti = formData.rental_mode === 'multi';
  const selectedCount = formData.selected_unit_ids.length;

  const perUnitAmount = isMulti && formData.pricing_mode === 'total' && selectedCount > 0 && formData.rent_amount
    ? parseFloat(formData.rent_amount) / selectedCount
    : 0;

  const suffixLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const handleClose = () => {
    onOpenChange(false);
    setFormData(emptyFormData);
    onReset();
  };

  return {
    formData, setFormData,
    propertyUnits,
    fiscalYears,
    occupiedUnitIds,
    handleSubmit,
    toggleUnit,
    isMulti,
    selectedCount,
    perUnitAmount,
    suffixLetters,
    handleClose,
  };
}
