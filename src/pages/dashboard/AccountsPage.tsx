import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useAccounts, useCreateAccount, useDeleteAccount } from '@/hooks/useAccounts';
import { useIncome } from '@/hooks/useIncome';
import { useExpenses } from '@/hooks/useExpenses';
import { useContracts, useUpdateContract, useDeleteContract } from '@/hooks/useContracts';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { useTenantPayments, useUpsertTenantPayment } from '@/hooks/useTenantPayments';
import { useAllUnits } from '@/hooks/useUnits';
import { useProperties } from '@/hooks/useProperties';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Plus, Printer, FileDown } from 'lucide-react';
import { generateAccountsPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { computeTotals, calculateFinancials, groupIncomeBySource, groupExpensesByType } from '@/utils/accountsCalculations';
import { notifyAllBeneficiaries } from '@/utils/notifications';

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
  const { data: accounts = [], isLoading } = useAccounts();
  const { data: income = [] } = useIncome();
  const { data: expenses = [] } = useExpenses();
  const { data: contracts = [] } = useContracts();
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

  // Editable settings
  const [adminPercent, setAdminPercent] = useState(10);
  const [waqifPercent, setWaqifPercent] = useState(5);
  const [fiscalYear, setFiscalYear] = useState('25/10/1446 - 25/10/1447هـ');
  const [zakatAmount, setZakatAmount] = useState(0);
  const [waqfCorpusManual, setWaqfCorpusManual] = useState(0);
  const [waqfCorpusPrevious, setWaqfCorpusPrevious] = useState(0);
  const [manualVat, setManualVat] = useState(0);
  const [manualDistributions, setManualDistributions] = useState(0);

  // Load settings from app_settings
  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase.from('app_settings').select('*');
      if (data) {
        data.forEach((s: { key: string; value: string }) => {
          if (s.key === 'admin_share_percentage') setAdminPercent(Number(s.value));
          if (s.key === 'waqif_share_percentage') setWaqifPercent(Number(s.value));
          if (s.key === 'fiscal_year') setFiscalYear(s.value);
        });
      }
    };
    loadSettings();
  }, []);

  // Load values from latest account
  useEffect(() => {
    if (accounts.length > 0) {
      const latest = accounts[0];
      if (latest.zakat_amount !== undefined) setZakatAmount(Number(latest.zakat_amount));
      if (latest.waqf_corpus_manual !== undefined) setWaqfCorpusManual(Number(latest.waqf_corpus_manual));
      if (latest.waqf_corpus_previous !== undefined) setWaqfCorpusPrevious(Number(latest.waqf_corpus_previous));
      if (latest.vat_amount !== undefined) setManualVat(Number(latest.vat_amount));
      if (latest.distributions_amount !== undefined) setManualDistributions(Number(latest.distributions_amount));
    }
  }, [accounts]);

  const saveSettingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSetting = useCallback(async (key: string, value: string) => {
    if (saveSettingTimeout.current) clearTimeout(saveSettingTimeout.current);
    saveSettingTimeout.current = setTimeout(async () => {
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
    setAdminPercent(Number(val));
    saveSetting('admin_share_percentage', val);
  };

  const handleWaqifPercentChange = (val: string) => {
    setWaqifPercent(Number(val));
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

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">الحسابات الختامية</h1>
            <p className="text-muted-foreground mt-1">إدارة ومتابعة الحسابات السنوية</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">طباعة</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => generateAccountsPDF({
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
            }, pdfWaqfInfo)} className="gap-2">
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">تصدير PDF</span>
            </Button>
            <Button onClick={handleCreateAccount} className="gradient-primary gap-2" disabled={createAccount.isPending}>
              <Plus className="w-4 h-4" />
              إنشاء حساب ختامي
            </Button>
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
      </div>
    </DashboardLayout>
  );
};

export default AccountsPage;
