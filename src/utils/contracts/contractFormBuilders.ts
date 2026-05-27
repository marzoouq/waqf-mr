/**
 * بنّاؤون نقيون لبيانات نموذج العقد (renew/edit initial + payload للحفظ).
 * مستخرج من useContractForm لتقليل حجم الهوك (#A3) — لا state، لا side effects.
 */
import type { Contract } from '@/types';
import { emptyFormData, type ContractFormData } from '@/types/forms/contract';

export const buildRenewInitialData = (contract: Contract): ContractFormData => {
  const num = contract.contract_number;
  const match = num.match(/-R(\d+)$/);
  const newNumber = match ? num.replace(/-R(\d+)$/, `-R${parseInt(match[1]!) + 1}`) : `${num}-R1`;
  const oldStart = new Date(contract.start_date);
  const oldEnd = new Date(contract.end_date);
  const durationMs = oldEnd.getTime() - oldStart.getTime();
  const newStart = new Date(oldEnd);
  const newEnd = new Date(newStart.getTime() + durationMs);
  return {
    ...emptyFormData,
    contract_number: newNumber,
    property_id: contract.property_id,
    unit_id: contract.unit_id || '',
    tenant_name: contract.tenant_name,
    start_date: newStart.toISOString().split('T')[0]!,
    end_date: newEnd.toISOString().split('T')[0]!,
    rent_amount: contract.rent_amount.toString(),
    status: 'active',
    notes: `تجديد للعقد ${contract.contract_number}`,
    payment_type: contract.payment_type || 'annual',
    payment_count: (contract.payment_count || 1).toString(),
    tenant_id_type: contract.tenant_id_type || 'NAT',
    tenant_id_number: contract.tenant_id_number || '',
    tenant_tax_number: contract.tenant_tax_number || '',
    tenant_crn: contract.tenant_crn || '',
    tenant_street: contract.tenant_street || '',
    tenant_building: contract.tenant_building || '',
    tenant_district: contract.tenant_district || '',
    tenant_city: contract.tenant_city || '',
    tenant_postal_code: contract.tenant_postal_code || '',
  };
};

export const buildEditInitialData = (contract: Contract): ContractFormData => ({
  ...emptyFormData,
  contract_number: contract.contract_number,
  property_id: contract.property_id,
  unit_id: contract.unit_id || '',
  tenant_name: contract.tenant_name,
  start_date: contract.start_date,
  end_date: contract.end_date,
  rent_amount: contract.rent_amount.toString(),
  status: contract.status,
  notes: contract.notes || '',
  payment_type: contract.payment_type || 'annual',
  payment_count: (contract.payment_count || 1).toString(),
  rental_mode: contract.unit_id ? 'single' : 'full',
  tenant_id_type: contract.tenant_id_type || 'NAT',
  tenant_id_number: contract.tenant_id_number || '',
  tenant_tax_number: contract.tenant_tax_number || '',
  tenant_crn: contract.tenant_crn || '',
  tenant_street: contract.tenant_street || '',
  tenant_building: contract.tenant_building || '',
  tenant_district: contract.tenant_district || '',
  tenant_city: contract.tenant_city || '',
  tenant_postal_code: contract.tenant_postal_code || '',
});

interface BuildContractPayloadArgs {
  formData: ContractFormData;
  contractNumber: string;
  unitId: string | null;
  rentAmount: number;
  paymentCount: number;
  fiscalYearId?: string | null;
}

export const buildContractPayload = ({
  formData, contractNumber, unitId, rentAmount, paymentCount, fiscalYearId,
}: BuildContractPayloadArgs): Record<string, unknown> => {
  const paymentAmount = rentAmount / paymentCount;
  const payload: Record<string, unknown> = {
    contract_number: contractNumber,
    property_id: formData.property_id,
    unit_id: unitId,
    tenant_name: formData.tenant_name,
    start_date: formData.start_date,
    end_date: formData.end_date,
    rent_amount: rentAmount,
    status: formData.status,
    notes: formData.notes || undefined,
    payment_type: formData.payment_type,
    payment_count: paymentCount,
    payment_amount: paymentAmount,
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
  if (fiscalYearId) payload.fiscal_year_id = fiscalYearId;
  return payload;
};
