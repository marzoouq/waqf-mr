import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useAccounts, useCreateAccount, useDeleteAccount } from '@/hooks/useAccounts';
import { useIncomeByFiscalYear } from '@/hooks/useIncome';
import { useExpensesByFiscalYear } from '@/hooks/useExpenses';
import { useContracts, useUpdateContract, useDeleteContract } from '@/hooks/useContracts';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { useTenantPayments, useUpsertTenantPayment } from '@/hooks/useTenantPayments';
import { useAllUnits } from '@/hooks/useUnits';
import { useProperties } from '@/hooks/useProperties';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useActiveFiscalYear, useFiscalYears } from '@/hooks/useFiscalYears';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { Plus, Lock } from 'lucide-react';
import ExportMenu from '@/components/ExportMenu';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { computeTotals, calculateFinancials, groupIncomeBySource, groupExpensesByType } from '@/utils/accountsCalculations';
import { notifyAllBeneficiaries } from '@/utils/notifications';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import AccountsSettingsBar from '@/components/accounts/AccountsSettingsBar';
import AccountsSummaryCards from '@/components/accounts/AccountsSummaryCards';
import AccountsContractsTable from '@/components/accounts/AccountsContractsTable';
import AccountsCollectionTable from '@/components/accounts/AccountsCollectionTable';
import AccountsIncomeTable from '@/components/accounts/AccountsIncomeTable';
import AccountsExpensesTable from '@/components/accounts/AccountsExpensesTable';
import AccountsDistributionTable from '@/components/accounts/AccountsDistributionTable';
import AccountsBeneficiariesTable from '@/components/accounts/AccountsBeneficiariesTable';
import AccountsSavedTable from '@/components/accounts/AccountsSavedTable';
import AccountsDialogs from '@/components/accounts/AccountsDialogs';

const AccountsPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const queryClient = useQueryClient();
  const { data: accounts = [], isLoading } = useAccounts();
  const { data: allContracts = [] } = useContracts();
  const { data: beneficiaries = [] } = useBeneficiaries();
  const { data: tenantPayments = [] } = useTenantPayments();
  const { data: allUnits = [] } = useAllUnits();
  const { data: properties = [] } = useProperties();
  const appSettings = useAppSettings();
  const createAccount = useCreateAccount();
  const deleteAccount = useDeleteAccount();
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();
  const upsertPayment = useUpsertTenantPayment();

  // Fiscal year selection - use global context
  const { fiscalYearId, fiscalYear: selectedFY, fiscalYears, isClosed } = useFiscalYear();

  const contracts = useMemo(() => {
    if (!fiscalYearId || fiscalYearId === 'all') return allContracts;
    return allContracts.filter(c => c.fiscal_year_id === fiscalYearId);
  }, [allContracts, fiscalYearId]);

  const { data: income = [] } = useIncomeByFiscalYear(fiscalYearId);
  const { data: expenses = [] } = useExpensesByFiscalYear(fiscalYearId);

  // Year closing state
  const [closeYearOpen, setCloseYearOpen] = useState(false);
  const [isClosingYear, setIsClosingYear] = useState(false);

  // Editable settings
  const [adminPercent, setAdminPercent] = useState(10);
  const [waqifPercent, setWaqifPercent] = useState(5);
  const [fiscalYear, setFiscalYear] = useState('25/10/1446 - 25/10/1447هـ');
  const [zakatAmount, setZakatAmount] = useState(0);
  const [waqfCorpusManual, setWaqfCorpusManual] = useState(0);
  const [waqfCorpusPrevious, setWaqfCorpusPrevious] = useState(0);
  const [manualVat, setManualVat] = useState(0);
  const [manualDistributions, setManualDistributions] = useState(0);

  // Load settings from app_settings (using existing appSettings hook)
  useEffect(() => {
    if (appSettings.data) {
      const settings = appSettings.data;
      if (settings['admin_share_percentage']) setAdminPercent(Number(settings['admin_share_percentage']));
      if (settings['waqif_share_percentage']) setWaqifPercent(Number(settings['waqif_share_percentage']));
      if (settings['fiscal_year']) setFiscalYear(settings['fiscal_year']);
    }
  }, [appSettings.data]);

  // Load values from the account matching selected fiscal year
  useEffect(() => {
    const fyLabel = selectedFY?.label;
    const matchingAccount = fyLabel
      ? accounts.find(a => a.fiscal_year === fyLabel)
      : accounts.length === 1 ? accounts[0] : null;
    if (matchingAccount) {
      if (matchingAccount.zakat_amount !== undefined) setZakatAmount(Number(matchingAccount.zakat_amount));
      if (matchingAccount.waqf_corpus_manual !== undefined) setWaqfCorpusManual(Number(matchingAccount.waqf_corpus_manual));
      if (matchingAccount.waqf_corpus_previous !== undefined) setWaqfCorpusPrevious(Number(matchingAccount.waqf_corpus_previous));
      if (matchingAccount.vat_amount !== undefined) setManualVat(Number(matchingAccount.vat_amount));
      if (matchingAccount.distributions_amount !== undefined) setManualDistributions(Number(matchingAccount.distributions_amount));
    } else {
      // No matching account — reset to zero for clean dynamic calculation
      setZakatAmount(0);
      setWaqfCorpusManual(0);
      setWaqfCorpusPrevious(0);
      setManualVat(0);
      setManualDistributions(0);
    }
  }, [accounts, selectedFY?.label]);

  const saveSettingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const saveSetting = useCallback(async (key: string, value: string) => {
    if (saveSettingTimeouts.current[key]) clearTimeout(saveSettingTimeouts.current[key]);
    saveSettingTimeouts.current[key] = setTimeout(async () => {
      try {
        const { error } = await supabase.from('app_settings').upsert({ key, value }, { onConflict: 'key' });
        if (error) throw error;
        toast.success('تم حفظ الإعداد');
      } catch (err) {
        toast.error('خطأ في حفظ الإعداد: ' + (err instanceof Error ? err.message : 'خطأ غير معروف'));
      }
    }, 500);
  }, []);

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

  const { totalIncome, totalExpenses } = computeTotals(income, expenses);

  // Auto-calculate commercial VAT for reference only
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

  // === FINANCIAL SEQUENCE (using shared calculation) ===
  const financials = calculateFinancials({
    totalIncome, totalExpenses, waqfCorpusPrevious, manualVat,
    zakatAmount, adminPercent, waqifPercent,
    waqfCorpusManual, manualDistributions,
  });
  const { grandTotal, netAfterExpenses, netAfterVat, netAfterZakat, adminShare, waqifShare, waqfRevenue, availableAmount, remainingBalance } = financials;

  // Group income by source
  const incomeBySource = groupIncomeBySource(income);

  // Group expenses by type
  const expensesByType = groupExpensesByType(expenses);

  // rent_amount هو الإيجار السنوي
  const totalAnnualRent = contracts.reduce((sum, c) => sum + Number(c.rent_amount), 0);

  const getPaymentPerPeriod = (contract: typeof contracts[0]) => {
    const rent = Number(contract.rent_amount);
    if (contract.payment_amount) return Number(contract.payment_amount);
    const count = contract.payment_count || 1;
    return rent / count;
  };

  const getExpectedPayments = (contract: typeof contracts[0]) => {
    if (contract.payment_type === 'monthly') return 12;
    if (contract.payment_type === 'multi') return contract.payment_count || 1;
    return 1;
  };

  const totalPaymentPerPeriod = contracts.reduce((sum, c) => sum + getPaymentPerPeriod(c), 0);

  const paymentMap = tenantPayments.reduce((acc, p) => {
    acc[p.contract_id] = p;
    return acc;
  }, {} as Record<string, typeof tenantPayments[0]>);

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

  const collectionData = contracts.map((contract, index) => {
    const paymentInfo = paymentMap[contract.id];
    const expectedPayments = getExpectedPayments(contract);
    const paidMonths = paymentInfo ? paymentInfo.paid_months : expectedPayments;
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
  });

  const totalCollectedAll = collectionData.reduce((sum, d) => sum + d.totalCollected, 0);
  const totalArrearsAll = collectionData.reduce((sum, d) => sum + d.arrears, 0);
  const totalPaidMonths = collectionData.reduce((sum, d) => sum + d.paidMonths, 0);
  const totalExpectedPayments = collectionData.reduce((sum, d) => sum + d.expectedPayments, 0);

  const totalBeneficiaryPercentage = beneficiaries.reduce((sum, b) => sum + Number(b.share_percentage), 0);

  const handleCreateAccount = async () => {
    await createAccount.mutateAsync({
      fiscal_year: fiscalYear,
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

    notifyAllBeneficiaries(
      'تحديث الحسابات الختامية',
      `تم تحديث الحسابات الختامية للسنة المالية ${fiscalYear}`,
      'payment',
      '/beneficiary/accounts',
    );
    if (manualDistributions > 0) {
      notifyAllBeneficiaries(
        'تحديث التوزيعات المالية',
        `تم تحديث توزيعات الأرباح للسنة المالية ${fiscalYear}. يرجى مراجعة حصتك`,
        'payment',
        '/beneficiary/my-share',
      );
    }
  };

  // Close fiscal year handler
  const handleCloseYear = async () => {
    if (!selectedFY || selectedFY.status === 'closed') return;
    setIsClosingYear(true);
    try {
      // Step A: Auto-save final account snapshot before closing
      await createAccount.mutateAsync({
        fiscal_year: fiscalYear,
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

      // Step B: Close current fiscal year
      const { error: closeErr } = await supabase
        .from('fiscal_years')
        .update({ status: 'closed' })
        .eq('id', selectedFY.id);
      if (closeErr) throw closeErr;

      // Step C: Create next fiscal year with carried-forward balance
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
          .insert({ label: nextLabel, start_date: nextStartDate, end_date: nextEndDate, status: 'active' })
          .select('id')
          .single();
        if (createErr) throw createErr;
        nextFYId = newFY.id;
      }

      // Step D: Create initial account for new year with only carried-forward balance
      if (nextFYId) {
        await supabase.from('accounts').insert({
          fiscal_year: nextLabel,
          waqf_corpus_previous: waqfCorpusManual,
          total_income: 0, total_expenses: 0, admin_share: 0, waqif_share: 0,
          waqf_revenue: 0, vat_amount: 0, distributions_amount: 0,
          waqf_capital: 0, net_after_expenses: 0, net_after_vat: 0,
          zakat_amount: 0, waqf_corpus_manual: 0,
        });
      }

      // Step E: Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ['fiscal_years'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['income'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });

      // Step F: Notify beneficiaries
      notifyAllBeneficiaries(
        'إقفال السنة المالية',
        `تم إقفال السنة المالية ${selectedFY.label} وأرشفة جميع البيانات. تم ترحيل رقبة الوقف (${waqfCorpusManual.toLocaleString()} ر.س) للسنة الجديدة.`,
        'info',
        '/beneficiary/accounts',
      );

      toast.success(`تم إقفال السنة المالية ${selectedFY.label} وترحيل الرصيد بنجاح`);
      setCloseYearOpen(false);
    } catch (err) {
      toast.error('خطأ في إقفال السنة: ' + (err instanceof Error ? err.message : 'خطأ غير معروف'));
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
      const expectedPmts = getExpectedPayments(contract);
      const newAnnual = editData.monthlyRent * expectedPmts;
      await updateContract.mutateAsync({
        id: contract.id,
        tenant_name: editData.tenantName,
        rent_amount: newAnnual,
        payment_amount: editData.monthlyRent,
      });

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
      netRevenue: netAfterVat,
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
    }, pdfWaqfInfo);
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display truncate">الحسابات الختامية</h1>
            <p className="text-muted-foreground mt-1 text-sm">إدارة ومتابعة الحسابات السنوية</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isClosed && (
              <span className="text-xs text-warning dark:text-warning font-medium flex items-center gap-1 bg-warning/10 px-3 py-1 rounded-md border border-warning/30">
                <Lock className="w-3 h-3" /> سنة مقفلة - تعديل بصلاحية الناظر
              </span>
            )}
            <ExportMenu onExportPdf={handleExportPdf} />
            <Button onClick={handleCreateAccount} className="gradient-primary gap-2" disabled={createAccount.isPending}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">إنشاء حساب ختامي</span>
            </Button>
            {selectedFY && selectedFY.status === 'active' && (
              <Button variant="destructive" size="sm" onClick={() => setCloseYearOpen(true)} className="gap-2">
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline">إقفال السنة</span>
              </Button>
            )}
          </div>
        </div>

        <AccountsSettingsBar
          fiscalYear={fiscalYear}
          adminPercent={adminPercent}
          waqifPercent={waqifPercent}
          waqfCorpusPrevious={waqfCorpusPrevious}
          manualVat={manualVat}
          zakatAmount={zakatAmount}
          waqfCorpusManual={waqfCorpusManual}
          manualDistributions={manualDistributions}
          calculatedVat={calculatedVat}
          commercialRent={commercialRent}
          vatPercentage={vatPercentage}
          onFiscalYearChange={handleFiscalYearChange}
          onAdminPercentChange={handleAdminPercentChange}
          onWaqifPercentChange={handleWaqifPercentChange}
          onWaqfCorpusPreviousChange={setWaqfCorpusPrevious}
          onManualVatChange={setManualVat}
          onZakatAmountChange={setZakatAmount}
          onWaqfCorpusManualChange={setWaqfCorpusManual}
          onManualDistributionsChange={setManualDistributions}
        />

        <AccountsSummaryCards
          waqfCorpusPrevious={waqfCorpusPrevious}
          totalIncome={totalIncome}
          grandTotal={grandTotal}
          totalExpenses={totalExpenses}
          netAfterExpenses={netAfterExpenses}
          manualVat={manualVat}
          netAfterVat={netAfterVat}
          zakatAmount={zakatAmount}
          adminPercent={adminPercent}
          adminShare={adminShare}
          waqifPercent={waqifPercent}
          waqifShare={waqifShare}
          waqfRevenue={waqfRevenue}
          waqfCorpusManual={waqfCorpusManual}
          manualDistributions={manualDistributions}
          remainingBalance={remainingBalance}
        />

        <AccountsContractsTable
          contracts={contracts}
          getPaymentPerPeriod={getPaymentPerPeriod}
          getExpectedPayments={getExpectedPayments}
          totalPaymentPerPeriod={totalPaymentPerPeriod}
          totalAnnualRent={totalAnnualRent}
          statusLabel={statusLabel}
          onEditContract={handleOpenContractEdit}
          onDeleteContract={(id, name) => setDeleteTarget({ type: 'contract', id, name })}
        />

        <AccountsCollectionTable
          contracts={contracts}
          collectionData={collectionData}
          editingIndex={editingIndex}
          editData={editData}
          setEditData={setEditData}
          onStartEdit={handleStartEdit}
          onCancelEdit={handleCancelEdit}
          onSaveEdit={handleSaveEdit}
          totalExpectedPayments={totalExpectedPayments}
          totalPaidMonths={totalPaidMonths}
          totalCollectedAll={totalCollectedAll}
          totalArrearsAll={totalArrearsAll}
          isUpdatePending={updateContract.isPending}
          isUpsertPending={upsertPayment.isPending}
        />

        <AccountsIncomeTable
          incomeCount={income.length}
          incomeBySource={incomeBySource}
          totalIncome={totalIncome}
        />

        <AccountsExpensesTable
          expensesCount={expenses.length}
          expensesByType={expensesByType}
          totalExpenses={totalExpenses}
        />

        <AccountsDistributionTable
          waqfCorpusPrevious={waqfCorpusPrevious}
          totalIncome={totalIncome}
          grandTotal={grandTotal}
          totalExpenses={totalExpenses}
          netAfterExpenses={netAfterExpenses}
          manualVat={manualVat}
          netAfterVat={netAfterVat}
          zakatAmount={zakatAmount}
          netAfterZakat={netAfterZakat}
          adminPercent={adminPercent}
          adminShare={adminShare}
          waqifPercent={waqifPercent}
          waqifShare={waqifShare}
          waqfRevenue={waqfRevenue}
          waqfCorpusManual={waqfCorpusManual}
          availableAmount={availableAmount}
          manualDistributions={manualDistributions}
          remainingBalance={remainingBalance}
        />

        <AccountsBeneficiariesTable
          beneficiaries={beneficiaries}
          manualDistributions={manualDistributions}
          totalBeneficiaryPercentage={totalBeneficiaryPercentage}
        />

        <AccountsSavedTable
          accounts={accounts}
          isLoading={isLoading}
          onDeleteAccount={(id, name) => setDeleteTarget({ type: 'account', id, name })}
        />

        <AccountsDialogs
          deleteTarget={deleteTarget}
          setDeleteTarget={setDeleteTarget}
          onConfirmDelete={handleConfirmDelete}
          contractEditOpen={contractEditOpen}
          setContractEditOpen={setContractEditOpen}
          editingContractData={editingContractData}
          setEditingContractData={setEditingContractData}
          onSaveContractEdit={handleSaveContractEdit}
          isUpdatePending={updateContract.isPending}
        />

        {/* Close Year AlertDialog */}
        <AlertDialog open={closeYearOpen} onOpenChange={setCloseYearOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد إقفال السنة المالية</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>سيتم تنفيذ الخطوات التالية عند تأكيد الإقفال:</p>
                  <ul className="list-disc list-inside space-y-1 mr-2">
                    <li>حفظ الحساب الختامي النهائي وأرشفة جميع البيانات للسنة <strong className="text-foreground">{selectedFY?.label}</strong></li>
                    <li>إقفال السنة المالية نهائياً (لن يمكن التعديل بعد الإقفال)</li>
                    <li>ترحيل رقبة الوقف <strong className="text-foreground">({waqfCorpusManual.toLocaleString()} ر.س)</strong> للسنة الجديدة</li>
                    <li>إشعار جميع المستفيدين بإقفال السنة</li>
                  </ul>
                  <p className="text-xs mt-2">جميع البيانات المؤرشفة ستبقى متاحة للاطلاع عليها.</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogCancel disabled={isClosingYear}>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCloseYear}
                disabled={isClosingYear}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isClosingYear ? 'جاري الإقفال...' : 'تأكيد الإقفال'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default AccountsPage;
