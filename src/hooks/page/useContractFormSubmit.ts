/**
 * معالجات إرسال نموذج العقد — إنشاء/تعديل
 * مستخرج من useContractsPage لتقليل حجم الملف
 */
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCreateContract, useUpdateContract } from '@/hooks/data/useContracts';
import type { Contract } from '@/types/database';
import type { ContractFormData } from '@/components/contracts/contractForm.types';
import { toast } from 'sonner';

interface Deps {
  fiscalYearId: string;
  editingContract: Contract | null;
}

export const useContractFormSubmit = ({ fiscalYearId, editingContract }: Deps) => {
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();

  const handleFormSubmit = useCallback(async (formData: ContractFormData, isEditing: boolean) => {
    if (formData.end_date <= formData.start_date) {
      toast.error('تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية');
      return;
    }
    const paymentCount = formData.payment_type === 'monthly' ? 12
      : formData.payment_type === 'quarterly' ? 4
      : formData.payment_type === 'semi_annual' ? 2
      : (formData.payment_type === 'annual' ? 1 : parseInt(formData.payment_count) || 1);

    // بناء بيانات المستأجر المشتركة
    const tenantFields = {
      tenant_id_type: formData.tenant_id_type || 'NAT',
      tenant_id_number: formData.tenant_id_number || null,
      tenant_tax_number: formData.tenant_tax_number || null,
      tenant_crn: formData.tenant_crn || null,
      tenant_street: formData.tenant_street || null,
      tenant_building: formData.tenant_building || null,
      tenant_district: formData.tenant_district || null,
      tenant_city: formData.tenant_city || null,
      tenant_postal_code: formData.tenant_postal_code || null,
    };

    if (isEditing && editingContract) {
      const rentAmount = parseFloat(formData.rent_amount);
      const paymentAmount = rentAmount / paymentCount;
      const contractData: Record<string, unknown> = {
        contract_number: formData.contract_number, property_id: formData.property_id,
        unit_id: formData.unit_id || null, tenant_name: formData.tenant_name,
        start_date: formData.start_date, end_date: formData.end_date, rent_amount: rentAmount,
        status: formData.status, notes: formData.notes || undefined,
        payment_type: formData.payment_type, payment_count: paymentCount, payment_amount: paymentAmount,
        ...tenantFields,
      };
      await updateContract.mutateAsync({ id: editingContract.id, ...contractData } as unknown as Parameters<typeof updateContract.mutateAsync>[0]);
      return;
    }

    // تحديد السنة المالية النشطة
    const contextFYId = fiscalYearId && fiscalYearId !== 'all' ? fiscalYearId : null;
    let activeFYId = contextFYId;
    if (!activeFYId) {
      const { data: activeFY } = await supabase.from('fiscal_years').select('id').eq('status', 'active').limit(1).maybeSingle();
      activeFYId = activeFY?.id || null;
    }

    const suffixLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    if (formData.rental_mode === 'multi' && formData.selected_unit_ids.length > 1) {
      const units = formData.selected_unit_ids;
      let created = 0;
      for (let i = 0; i < units.length; i++) {
        const unitId = units[i]!;
        const contractNumber = `${formData.contract_number}-${suffixLetters[i] || (i + 1)}`;
        let rentAmount: number;
        if (formData.pricing_mode === 'per_unit') {
          rentAmount = parseFloat(formData.rent_per_unit[unitId] ?? '0') || 0;
        } else {
          rentAmount = parseFloat(formData.rent_amount) / units.length;
        }
        const paymentAmount = rentAmount / paymentCount;
        const contractData: Record<string, unknown> = {
          contract_number: contractNumber, property_id: formData.property_id, unit_id: unitId,
          tenant_name: formData.tenant_name,
          start_date: formData.start_date, end_date: formData.end_date, rent_amount: rentAmount,
          status: formData.status, notes: formData.notes || undefined,
          payment_type: formData.payment_type, payment_count: paymentCount, payment_amount: paymentAmount,
          fiscal_year_id: activeFYId || null,
          ...tenantFields,
        };
        await createContract.mutateAsync(contractData as unknown as Parameters<typeof createContract.mutateAsync>[0]);
        created++;
      }
      toast.success(`تم إنشاء ${created} عقد للمستأجر ${formData.tenant_name}`);
    } else {
      const rentAmount = parseFloat(formData.rent_amount);
      const paymentAmount = rentAmount / paymentCount;
      const contractData: Record<string, unknown> = {
        contract_number: formData.contract_number, property_id: formData.property_id,
        unit_id: (formData.rental_mode === 'single' ? formData.unit_id
          : (formData.rental_mode === 'multi' && formData.selected_unit_ids.length === 1 ? formData.selected_unit_ids[0] : null)) || null,
        tenant_name: formData.tenant_name,
        start_date: formData.start_date, end_date: formData.end_date, rent_amount: rentAmount,
        status: formData.status, notes: formData.notes || undefined,
        payment_type: formData.payment_type, payment_count: paymentCount, payment_amount: paymentAmount,
        ...tenantFields,
      };
      if (activeFYId) contractData.fiscal_year_id = activeFYId;
      await createContract.mutateAsync(contractData as unknown as Parameters<typeof createContract.mutateAsync>[0]);
    }
  }, [editingContract, fiscalYearId, createContract, updateContract]);

  return {
    handleFormSubmit,
    isPending: createContract.isPending || updateContract.isPending,
  };
};
