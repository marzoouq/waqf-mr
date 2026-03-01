/**
 * Custom hook encapsulating AccountsPage business logic
 * Extracted from AccountsPage.tsx for modularity
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from '@/hooks/useAccounts';
import { useIncomeByFiscalYear } from '@/hooks/useIncome';
import { useExpensesByFiscalYear } from '@/hooks/useExpenses';
import { useContracts, useUpdateContract, useDeleteContract } from '@/hooks/useContracts';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { useTenantPayments, useUpsertTenantPayment } from '@/hooks/useTenantPayments';
import { useAllUnits } from '@/hooks/useUnits';
import { useProperties } from '@/hooks/useProperties';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { allocateContractToFiscalYears } from '@/utils/contractAllocation';
import { computeTotals, calculateFinancials, groupIncomeBySource, groupExpensesByType } from '@/utils/accountsCalculations';
import { notifyAllBeneficiaries } from '@/utils/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/** Module-level helper: find account by fiscal year (UUID first, then label fallback) */
export function findAccountByFY<T extends { fiscal_year_id?: string | null; fiscal_year: string }>(
  accts: T[],
  fy: { id: string; label: string } | null
): T | null {
  if (fy) {
    return accts.find(a =>
      (fy.id && a.fiscal_year_id === fy.id) ||
      a.fiscal_year === fy.label
    ) ?? null;
  }
  return accts.length === 1 ? accts[0] : null;
}

export function useAccountsPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const { data: accounts = [], isLoading } = useAccounts();
  const { data: allContracts = [] } = useContracts();
  const { data: beneficiaries = [] } = useBeneficiaries();
  const { data: tenantPayments = [] } = useTenantPayments();
  const { data: allUnits = [] } = useAllUnits();
  const { data: properties = [] } = useProperties();
  const appSettings = useAppSettings();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();
  const upsertPayment = useUpsertTenantPayment();

  const { fiscalYearId, fiscalYear: selectedFY, fiscalYears, isClosed } = useFiscalYear();

  // Dynamic allocation: compute contract allocations in memory instead of fetching from DB
  const allocationMap = useMemo(() => {
    const map = new Map<string, { allocated_payments: number; allocated_amount: number }>();
    if (!fiscalYearId || fiscalYearId === 'all' || fiscalYears.length === 0) return map;
    for (const c of allContracts) {
      const allocs = allocateContractToFiscalYears(
        {
          id: c.id,
          start_date: c.start_date,
          end_date: c.end_date,
          rent_amount: Number(c.rent_amount),
          payment_type: c.payment_type,
          payment_count: c.payment_count,
          payment_amount: c.payment_amount ? Number(c.payment_amount) : undefined,
        },
        fiscalYears
      );
      const match = allocs.find(a => a.fiscal_year_id === fiscalYearId);
      if (match) {
        map.set(c.id, { allocated_payments: match.allocated_payments, allocated_amount: match.allocated_amount });
      }
    }
    return map;
  }, [allContracts, fiscalYearId, fiscalYears]);

  const contracts = useMemo(() => {
    if (!fiscalYearId || fiscalYearId === 'all') return allContracts;
    // Include contracts that have dynamic allocations for this FY OR are directly assigned to it
    return allContracts.filter(c => c.fiscal_year_id === fiscalYearId || allocationMap.has(c.id));
  }, [allContracts, fiscalYearId, allocationMap]);

  const { data: income = [] } = useIncomeByFiscalYear(fiscalYearId);
  const { data: expenses = [] } = useExpensesByFiscalYear(fiscalYearId);

  // Year closing state
  const [closeYearOpen, setCloseYearOpen] = useState(false);
  const [isClosingYear, setIsClosingYear] = useState(false);

  // Editable settings
  const [adminPercent, setAdminPercent] = useState(10);
  const [waqifPercent, setWaqifPercent] = useState(5);
  const [fiscalYear, setFiscalYear] = useState('');
  const [zakatAmount, setZakatAmount] = useState(0);
  const [waqfCorpusManual, setWaqfCorpusManual] = useState(0);
  const [waqfCorpusPrevious, setWaqfCorpusPrevious] = useState(0);
  const [manualVat, setManualVat] = useState(0);
  const [manualDistributions, setManualDistributions] = useState(0);

  useEffect(() => {
    if (appSettings.data) {
      const settings = appSettings.data;
      if (settings['admin_share_percentage']) setAdminPercent(Number(settings['admin_share_percentage']));
      if (settings['waqif_share_percentage']) setWaqifPercent(Number(settings['waqif_share_percentage']));
      if (settings['fiscal_year']) setFiscalYear(settings['fiscal_year']);
    }
  }, [appSettings.data]);

  useEffect(() => {
    const matchingAccount = findAccountByFY(accounts, selectedFY);
    if (matchingAccount) {
      if (matchingAccount.zakat_amount !== undefined) setZakatAmount(Number(matchingAccount.zakat_amount));
      if (matchingAccount.waqf_corpus_manual !== undefined) setWaqfCorpusManual(Number(matchingAccount.waqf_corpus_manual));
      if (matchingAccount.waqf_corpus_previous !== undefined) setWaqfCorpusPrevious(Number(matchingAccount.waqf_corpus_previous));
      if (matchingAccount.vat_amount !== undefined) setManualVat(Number(matchingAccount.vat_amount));
      if (matchingAccount.distributions_amount !== undefined) setManualDistributions(Number(matchingAccount.distributions_amount));
    } else {
      setZakatAmount(0);
      setWaqfCorpusManual(0);
      setWaqfCorpusPrevious(0);
      setManualVat(0);
      setManualDistributions(0);
    }
  }, [accounts, selectedFY?.id, selectedFY?.label]);

  const saveSettingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // H8 fix: stable ref for mutateAsync to prevent debounce resets
  const updateSettingRef = useRef(appSettings.updateSetting.mutateAsync);
  updateSettingRef.current = appSettings.updateSetting.mutateAsync;

  const saveSetting = useCallback(async (key: string, value: string) => {
    if (saveSettingTimeouts.current[key]) clearTimeout(saveSettingTimeouts.current[key]);
    saveSettingTimeouts.current[key] = setTimeout(async () => {
      try {
        await updateSettingRef.current({ key, value });
        toast.success('تم حفظ الإعداد');
      } catch (err) {
        console.error('خطأ في حفظ الإعداد:', err instanceof Error ? err.message : err);
        toast.error('خطأ في حفظ الإعداد');
      }
    }, 500);
  }, []); // stable — no dependencies

  const handleAdminPercentChange = (val: string) => {
    const num = parseFloat(val);
    if (!Number.isFinite(num) || num < 0 || num > 100) {
      toast.error('نسبة الناظر يجب أن تكون رقماً بين 0 و 100');
      return;
    }
    setAdminPercent(num);
    saveSetting('admin_share_percentage', val);
  };

  const handleWaqifPercentChange = (val: string) => {
    const num = parseFloat(val);
    if (!Number.isFinite(num) || num < 0 || num > 100) {
      toast.error('نسبة الواقف يجب أن تكون رقماً بين 0 و 100');
      return;
    }
    setWaqifPercent(num);
    saveSetting('waqif_share_percentage', val);
  };

  const handleFiscalYearChange = (val: string) => {
    setFiscalYear(val);
    saveSetting('fiscal_year', val);
  };

  const { totalIncome, totalExpenses } = useMemo(
    () => computeTotals(income, expenses),
    [income, expenses]
  );

  const vatPercentage = Number(appSettings.data?.['vat_percentage'] || '15');
  const residentialVatExempt = (appSettings.data?.['residential_vat_exempt'] || 'true') === 'true';

  const isCommercialContract = (contract: typeof contracts[0]) => {
    if (!residentialVatExempt) return true;
    if (contract.unit_id) {
      const unit = allUnits.find(u => u.id === contract.unit_id);
      if (unit?.unit_type === 'محل') return true;
      if (unit?.unit_type === 'شقة') return false;
    }
    const property = properties.find(p => p.id === contract.property_id);
    if (property?.property_type === 'تجاري') return true;
    return false;
  };

  const commercialRent = contracts
    .filter(c => isCommercialContract(c))
    .reduce((sum, c) => sum + Number(c.rent_amount), 0);
  const calculatedVat = commercialRent * (vatPercentage / 100);

  // AccountsPage always shows shares (forceClosedMode) so admin can preview before closing
  const financials = useMemo(() => calculateFinancials({
    totalIncome, totalExpenses, waqfCorpusPrevious, manualVat,
    zakatAmount, adminPercent, waqifPercent,
    waqfCorpusManual, manualDistributions,
    isClosed: true, // Always compute shares in accounts page
  }), [totalIncome, totalExpenses, waqfCorpusPrevious, manualVat, zakatAmount, adminPercent, waqifPercent, waqfCorpusManual, manualDistributions]);
  const { grandTotal, netAfterExpenses, netAfterVat, netAfterZakat, adminShare, waqifShare, waqfRevenue, availableAmount, remainingBalance } = financials;

  const incomeBySource = useMemo(() => groupIncomeBySource(income), [income]);
  const expensesByType = useMemo(() => groupExpensesByType(expenses), [expenses]);

  const totalAnnualRent = contracts.reduce((sum, c) => {
    const allocation = allocationMap.get(c.id);
    return sum + (allocation ? allocation.allocated_amount : Number(c.rent_amount));
  }, 0);

  const getPaymentPerPeriod = (contract: typeof contracts[0]) => {
    const rent = Number(contract.rent_amount);
    if (contract.payment_amount) return Number(contract.payment_amount);
    const count = contract.payment_count || 1;
    return rent / count;
  };

  const getExpectedPayments = (contract: typeof contracts[0]) => {
    // If allocation exists for this FY, use allocated payments
    const allocation = allocationMap.get(contract.id);
    if (allocation) return allocation.allocated_payments;
    // Fallback: compute from contract duration
    const start = new Date(contract.start_date);
    const end = new Date(contract.end_date);
    const months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
    if (contract.payment_type === 'monthly') return months;
    if (contract.payment_type === 'quarterly') return Math.max(1, Math.ceil(months / 3));
    if (contract.payment_type === 'semi_annual' || contract.payment_type === 'semi-annual') return Math.max(1, Math.ceil(months / 6));
    if (contract.payment_type === 'annual') return Math.max(1, Math.ceil(months / 12));
    if (contract.payment_type === 'multi') return contract.payment_count || 1;
    return 1;
  };

  const totalPaymentPerPeriod = contracts.reduce((sum, c) => sum + getPaymentPerPeriod(c), 0);

  const paymentMap = useMemo(() => tenantPayments.reduce((acc, p) => {
    acc[p.contract_id] = p;
    return acc;
  }, {} as Record<string, typeof tenantPayments[0]>), [tenantPayments]);

  // Editing state for collection table
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<{
    tenantName: string;
    monthlyRent: number;
    paidMonths: number;
    status: string;
  } | null>(null);

  // Contract edit dialog
  const [contractEditOpen, setContractEditOpen] = useState(false);
  const [editingContractData, setEditingContractData] = useState<{
    id: string;
    tenant_name: string;
    rent_amount: number;
    status: string;
    contract_number: string;
  } | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  const collectionData = useMemo(() => contracts.map((contract, index) => {
    const paymentInfo = paymentMap[contract.id];
    const expectedPayments = getExpectedPayments(contract);
    const paidMonths = paymentInfo ? paymentInfo.paid_months : 0; // H1 fix: default to 0, not expectedPayments
    const paymentPerPeriod = getPaymentPerPeriod(contract);
    const totalCollected = paymentPerPeriod * paidMonths;
    const arrears = paymentPerPeriod * expectedPayments - totalCollected;
    return {
      index: index + 1,
      tenantName: contract.tenant_name,
      paymentPerPeriod,
      expectedPayments,
      paidMonths,
      totalCollected,
      arrears,
      status: arrears <= 0 ? 'مكتمل' : 'متأخر',
      notes: paymentInfo?.notes || '',
    };
  }), [contracts, paymentMap]);

  const totalCollectedAll = collectionData.reduce((sum, d) => sum + d.totalCollected, 0);
  const totalArrearsAll = collectionData.reduce((sum, d) => sum + d.arrears, 0);
  const totalPaidMonths = collectionData.reduce((sum, d) => sum + d.paidMonths, 0);
  const totalExpectedPayments = collectionData.reduce((sum, d) => sum + d.expectedPayments, 0);

  const totalBeneficiaryPercentage = beneficiaries.reduce((sum, b) => sum + Number(b.share_percentage), 0);

  const buildAccountData = () => ({
    fiscal_year: selectedFY?.label || fiscalYear,
    fiscal_year_id: selectedFY?.id || null,
    total_income: totalIncome,
    total_expenses: totalExpenses,
    admin_share: adminShare,
    waqif_share: waqifShare,
    waqf_revenue: waqfRevenue,
    vat_amount: manualVat,
    distributions_amount: manualDistributions,
    waqf_capital: waqfCorpusManual,
    net_after_expenses: netAfterExpenses,
    net_after_vat: netAfterVat,
    zakat_amount: zakatAmount,
    waqf_corpus_manual: waqfCorpusManual,
    waqf_corpus_previous: waqfCorpusPrevious,
  });

  const handleCreateAccount = async () => {
    try {
      await createAccount.mutateAsync(buildAccountData());
      notifyAllBeneficiaries(
        'تحديث الحسابات الختامية',
        `تم تحديث الحسابات الختامية للسنة المالية ${selectedFY?.label || fiscalYear}`,
        'info', '/beneficiary/accounts',
      );
      if (manualDistributions > 0) {
        notifyAllBeneficiaries(
          'تحديث التوزيعات المالية',
          `تم تحديث توزيعات الأرباح للسنة المالية ${selectedFY?.label || fiscalYear}. يرجى مراجعة حصتك`,
          'info', '/beneficiary/my-share',
        );
      }
    } catch (err) {
      console.error('خطأ في حفظ الحسابات:', err instanceof Error ? err.message : err);
      toast.error('خطأ في حفظ الحسابات');
    }
  };

  const handleCloseYear = async () => {
    if (!selectedFY || selectedFY.status === 'closed') return;
    if (role !== 'admin') {
      toast.error('فقط الناظر يمكنه إقفال السنة المالية');
      return;
    }
    setIsClosingYear(true);
    try {
      // التحقق من عدم وجود حساب ختامي مكرر لنفس السنة
      const { data: existingAccount } = await supabase
        .from('accounts')
        .select('id')
        .eq('fiscal_year_id', selectedFY.id)
        .maybeSingle();
      if (existingAccount) {
        // تحديث الحساب الموجود بدلاً من إنشاء مكرر
        await updateAccount.mutateAsync({ id: existingAccount.id, ...buildAccountData() });
      } else {
        await createAccount.mutateAsync(buildAccountData());
      }

      const { error: closeErr } = await supabase
        .from('fiscal_years')
        .update({ status: 'closed' })
        .eq('id', selectedFY.id);
      if (closeErr) throw closeErr;

      const nextStartDate = selectedFY.end_date;
      const nextEndYear = new Date(selectedFY.end_date);
      nextEndYear.setFullYear(nextEndYear.getFullYear() + 1);
      const nextEndDate = nextEndYear.toISOString().split('T')[0];

      const startYear = new Date(selectedFY.end_date).getFullYear();
      const endYear = nextEndYear.getFullYear();
      const nextLabel = `${startYear}-${endYear}`;

      const { data: existingNext } = await supabase
        .from('fiscal_years')
        .select('id')
        .eq('start_date', nextStartDate)
        .maybeSingle();

      let nextFYId = existingNext?.id;

      if (!nextFYId) {
        const { data: newFY, error: createErr } = await supabase
          .from('fiscal_years')
          .insert({ label: nextLabel, start_date: nextStartDate, end_date: nextEndDate, status: 'active', published: false })
          .select('id')
          .single();
        if (createErr) throw createErr;
        nextFYId = newFY.id;
      }

      if (nextFYId) {
        // التحقق من عدم وجود حساب للسنة الجديدة مسبقاً
        const { data: existingSeedAccount } = await supabase
          .from('accounts')
          .select('id')
          .eq('fiscal_year_id', nextFYId)
          .maybeSingle();
        if (existingSeedAccount) {
          // الحساب موجود مسبقاً — تحديث رقبة الوقف المرحّلة فقط
          await supabase.from('accounts').update({ waqf_corpus_previous: waqfCorpusManual }).eq('id', existingSeedAccount.id);
        } else {
        const { error: seedErr } = await supabase.from('accounts').insert({
          fiscal_year: nextLabel,
          fiscal_year_id: nextFYId,
          waqf_corpus_previous: waqfCorpusManual,
          total_income: 0, total_expenses: 0, admin_share: 0, waqif_share: 0,
          waqf_revenue: 0, vat_amount: 0, distributions_amount: 0,
          waqf_capital: 0, net_after_expenses: 0, net_after_vat: 0,
          zakat_amount: 0, waqf_corpus_manual: 0,
        });
        if (seedErr) {
          toast.error('تحذير: فشل إنشاء حساب السنة الجديدة تلقائياً');
        }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['fiscal_years'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['income'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] }); // H4 fix
      queryClient.invalidateQueries({ queryKey: ['tenant_payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment_invoices'] });

      notifyAllBeneficiaries(
        'إقفال السنة المالية',
        `تم إقفال السنة المالية ${selectedFY.label} وأرشفة جميع البيانات. تم ترحيل رقبة الوقف (${waqfCorpusManual.toLocaleString()} ر.س) للسنة الجديدة.`,
        'info', '/beneficiary/accounts',
      );

      // H9 fix: warn admin that new year needs publishing
      toast.success(`تم إقفال السنة المالية ${selectedFY.label} وترحيل الرصيد بنجاح`);
      toast.info('تنبيه: السنة المالية الجديدة غير منشورة — يرجى نشرها من إعدادات السنوات المالية ليتمكن المستفيدون من رؤيتها', { duration: 8000 });
      setCloseYearOpen(false);
    } catch (err) {
      console.error('خطأ في إقفال السنة:', err instanceof Error ? err.message : err);
      toast.error('خطأ في إقفال السنة المالية');
    } finally {
      setIsClosingYear(false);
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'expired': return 'منتهي';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  const handleStartEdit = (index: number) => {
    const item = collectionData[index];
    setEditingIndex(index);
    setEditData({
      tenantName: item.tenantName,
      monthlyRent: item.paymentPerPeriod,
      paidMonths: item.paidMonths,
      status: item.status,
    });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditData(null);
  };

  const handleSaveEdit = async (index: number) => {
    if (!editData) return;
    const contract = contracts[index];
    try {
      // H2 fix: only update payment_amount (per-period), never recalculate rent_amount
      // rent_amount is the total contract value across all years — must not be overwritten
      await updateContract.mutateAsync({
        id: contract.id,
        tenant_name: editData.tenantName,
        payment_amount: editData.monthlyRent,
      });

      const expectedPmts = getExpectedPayments(contract);
      await upsertPayment.mutateAsync({
        contract_id: contract.id,
        paid_months: editData.paidMonths,
        notes: editData.status === 'مكتمل' ? '' : `متأخر ${expectedPmts - editData.paidMonths} دفعات`,
        auto_income: editData.paidMonths > (tenantPayments.find(p => p.contract_id === contract.id)?.paid_months ?? 0) ? {
          payment_amount: editData.monthlyRent,
          property_id: contract.property_id,
          fiscal_year_id: fiscalYearId === 'all' ? null : fiscalYearId,
          tenant_name: editData.tenantName,
        } : undefined,
      });

      setEditingIndex(null);
      setEditData(null);
    } catch {
      // handled by hooks
    }
  };

  const handleOpenContractEdit = (contract: { id: string; tenant_name: string; rent_amount: number; status: string; contract_number: string }) => {
    setEditingContractData({
      id: contract.id,
      tenant_name: contract.tenant_name,
      rent_amount: Number(contract.rent_amount),
      status: contract.status,
      contract_number: contract.contract_number,
    });
    setContractEditOpen(true);
  };

  const handleSaveContractEdit = async () => {
    if (!editingContractData) return;
    try {
      await updateContract.mutateAsync({
        id: editingContractData.id,
        tenant_name: editingContractData.tenant_name,
        rent_amount: editingContractData.rent_amount,
        status: editingContractData.status,
      });
      setContractEditOpen(false);
      setEditingContractData(null);
    } catch {
      // handled
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'contract') {
        await deleteContract.mutateAsync(deleteTarget.id);
      } else if (deleteTarget.type === 'account') {
        await deleteAccount.mutateAsync(deleteTarget.id);
      }
    } catch {
      // handled
    }
    setDeleteTarget(null);
  };

  const handleExportPdf = async () => {
    const { generateAccountsPDF } = await import('@/utils/pdf');
    await generateAccountsPDF({
      contracts,
      incomeBySource,
      expensesByType,
      totalIncome,
      totalExpenses,
      netRevenue: netAfterZakat,
      adminShare,
      waqifShare,
      waqfRevenue,
      beneficiaries,
      vatAmount: manualVat,
      distributionsAmount: manualDistributions,
      waqfCapital: waqfCorpusManual,
      zakatAmount,
      netAfterZakat,
      waqfCorpusPrevious,
      grandTotal,
      availableAmount,
      remainingBalance,
    });
  };

  const currentAccount = findAccountByFY(accounts, selectedFY);

  return {
    // Data
    accounts, contracts, beneficiaries, income, expenses, isLoading,
    selectedFY, fiscalYear, fiscalYears, fiscalYearId, isClosed, currentAccount,
    // Settings
    adminPercent, waqifPercent, zakatAmount, waqfCorpusManual, waqfCorpusPrevious,
    manualVat, manualDistributions, calculatedVat, commercialRent, vatPercentage,
    // Financials
    totalIncome, totalExpenses, grandTotal, netAfterExpenses, netAfterVat, netAfterZakat,
    adminShare, waqifShare, waqfRevenue, availableAmount, remainingBalance,
    incomeBySource, expensesByType,
    // Contract/collection data
    totalAnnualRent, totalPaymentPerPeriod, collectionData,
    totalCollectedAll, totalArrearsAll, totalPaidMonths, totalExpectedPayments,
    totalBeneficiaryPercentage,
    getPaymentPerPeriod, getExpectedPayments, statusLabel,
    // State setters
    setWaqfCorpusPrevious, setManualVat, setZakatAmount, setWaqfCorpusManual, setManualDistributions,
    // Collection editing
    editingIndex, editData, setEditData,
    handleStartEdit, handleCancelEdit, handleSaveEdit,
    // Contract editing
    contractEditOpen, setContractEditOpen, editingContractData, setEditingContractData,
    handleOpenContractEdit, handleSaveContractEdit,
    // Delete
    deleteTarget, setDeleteTarget, handleConfirmDelete,
    // Actions
    handleCreateAccount, handleCloseYear, handleExportPdf,
    handleFiscalYearChange, handleAdminPercentChange, handleWaqifPercentChange,
    // Close year dialog
    closeYearOpen, setCloseYearOpen, isClosingYear,
    // Mutation states
    createAccountPending: createAccount.isPending,
    updateContractPending: updateContract.isPending,
    upsertPaymentPending: upsertPayment.isPending,
  };
}
