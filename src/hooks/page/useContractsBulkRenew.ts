import { useState, useCallback, useMemo, useEffect } from 'react';
import { safeNumber } from '@/utils/safeNumber';
import { Contract } from '@/types/database';
import { toast } from 'sonner';
import { fetchActiveFiscalYear, notifyAdmins, notifyAllBeneficiaries } from '@/lib/services';

interface UseContractsBulkRenewParams {
  contracts: Contract[];
  fiscalYearId: string | null;
  createContractAsync: (data: Record<string, unknown>) => Promise<unknown>;
}

export const useContractsBulkRenew = ({ contracts, fiscalYearId, createContractAsync }: UseContractsBulkRenewParams) => {
  const [bulkRenewOpen, setBulkRenewOpen] = useState(false);
  const [bulkRenewing, setBulkRenewing] = useState(false);
  const [selectedForRenewal, setSelectedForRenewal] = useState<Set<string>>(new Set());

  useEffect(() => setSelectedForRenewal(new Set()), [fiscalYearId]);

  const expiredContracts = useMemo(() => contracts.filter(c => c.status === 'expired'), [contracts]);
  const expiredIds = useMemo(() => new Set(expiredContracts.map(c => c.id)), [expiredContracts]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedForRenewal(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAllExpired = useCallback(() => setSelectedForRenewal(new Set(expiredContracts.map(c => c.id))), [expiredContracts]);
  const deselectAll = useCallback(() => setSelectedForRenewal(new Set()), []);

  const handleBulkRenew = async () => {
    if (bulkRenewing) return;
    setBulkRenewing(true);
    try {
      const activeFY = await fetchActiveFiscalYear();
      const contractsToRenew = expiredContracts.filter(c => selectedForRenewal.has(c.id));
      let created = 0;
      for (const contract of contractsToRenew) {
        const oldStart = new Date(contract.start_date);
        const oldEnd = new Date(contract.end_date);
        const durationMs = oldEnd.getTime() - oldStart.getTime();
        const newStart = new Date(oldEnd);
        const newEnd = new Date(newStart.getTime() + durationMs);
        const startDate = newStart.toISOString().split('T')[0];
        const endDate = newEnd.toISOString().split('T')[0];
        const num = contract.contract_number;
        const match = num.match(/-R(\d+)$/);
        const newNumber = match ? num.replace(/-R(\d+)$/, `-R${parseInt(match[1]!) + 1}`) : `${num}-R1`;
        const paymentCount = contract.payment_type === 'monthly' ? 12 : contract.payment_type === 'quarterly' ? 4 : contract.payment_type === 'semi_annual' ? 2 : (contract.payment_type === 'annual' ? 1 : (contract.payment_count || 1));
        const paymentAmount = safeNumber(contract.rent_amount) / paymentCount;
        const newContract: Record<string, unknown> = {
          contract_number: newNumber, property_id: contract.property_id, unit_id: contract.unit_id || null,
          tenant_name: contract.tenant_name, start_date: startDate, end_date: endDate,
          rent_amount: contract.rent_amount, status: 'active',
          notes: `تجديد جماعي للعقد ${contract.contract_number}`,
          payment_type: contract.payment_type || 'annual', payment_count: paymentCount, payment_amount: paymentAmount,
          fiscal_year_id: activeFY?.id || null,
          tenant_id_type: contract.tenant_id_type || 'NAT',
          tenant_id_number: contract.tenant_id_number || null,
          tenant_tax_number: contract.tenant_tax_number || null,
          tenant_crn: contract.tenant_crn || null,
          tenant_street: contract.tenant_street || null,
          tenant_building: contract.tenant_building || null,
          tenant_district: contract.tenant_district || null,
          tenant_city: contract.tenant_city || null,
          tenant_postal_code: contract.tenant_postal_code || null,
        };
        await createContractAsync(newContract);
        created++;
      }
      await notifyAdmins('تجديد جماعي للعقود', `تم تجديد ${created} عقد منتهي بنجاح`, 'success', '/dashboard/contracts');
      await notifyAllBeneficiaries('تجديد عقود الإيجار', `تم تجديد ${created} عقد إيجار للسنة الجديدة`, 'info', '/beneficiary/notifications');
      toast.success(`تم تجديد ${created} عقد بنجاح`);
    } catch {
      toast.error('حدث خطأ أثناء التجديد');
    } finally {
      setBulkRenewing(false);
      setBulkRenewOpen(false);
      setSelectedForRenewal(new Set());
    }
  };

  return {
    bulkRenewOpen, setBulkRenewOpen,
    bulkRenewing,
    selectedForRenewal,
    expiredContracts, expiredIds,
    toggleSelection, selectAllExpired, deselectAll,
    handleBulkRenew,
  };
};
