/**
 * هوك فرعي لإدارة تأجير العقار بالكامل (بدون وحدات)
 */
import { useCreateContract, useUpdateContract } from './useContracts';
import { Property, Contract } from '@/types/database';
import { defaultNotify } from '@/lib/notify';
import type { WholeRentalForm } from '@/components/properties/units/WholePropertyTab';

export function useWholePropertyRental(property: Property, contracts: Contract[]) {
  const createContract = useCreateContract();
  const updateContractMutation = useUpdateContract();

  const wholePropertyContracts = contracts
    .filter(c => c.property_id === property.id && !c.unit_id)
    .sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
    });

  const wholePropertyContract = wholePropertyContracts[0] || null;

  const handleWholePropertySave = async (form: WholeRentalForm) => {
    if (!form.tenant_name || !form.rent_amount || !form.start_date || !form.end_date) {
      defaultNotify.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    const rentAmount = parseFloat(form.rent_amount);
    const paymentCount = form.payment_type === 'monthly' ? 12 : form.payment_type === 'multi' ? parseInt(form.payment_count || '1') : 1;
    const paymentAmount = rentAmount / paymentCount;

    if (wholePropertyContract) {
      await updateContractMutation.mutateAsync({
        id: wholePropertyContract.id, tenant_name: form.tenant_name, rent_amount: rentAmount,
        payment_type: form.payment_type, payment_count: paymentCount, payment_amount: paymentAmount,
        start_date: form.start_date, end_date: form.end_date,
      });
    } else {
      await createContract.mutateAsync({
        contract_number: `C-${property.property_number}-WHOLE-${Date.now().toString(36)}`,
        property_id: property.id, tenant_name: form.tenant_name, rent_amount: rentAmount,
        start_date: form.start_date, end_date: form.end_date, status: 'active',
        payment_type: form.payment_type, payment_count: paymentCount, payment_amount: paymentAmount,
      });
    }
  };

  const isPending = createContract.isPending || updateContractMutation.isPending;

  return {
    wholePropertyContracts,
    wholePropertyContract,
    handleWholePropertySave,
    isPending,
  };
}
