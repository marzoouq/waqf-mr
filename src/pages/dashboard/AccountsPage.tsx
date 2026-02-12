import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccounts, useCreateAccount, useDeleteAccount } from '@/hooks/useAccounts';
import { useIncome } from '@/hooks/useIncome';
import { useExpenses } from '@/hooks/useExpenses';
import { useContracts, useUpdateContract, useDeleteContract } from '@/hooks/useContracts';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { useTenantPayments, useUpsertTenantPayment } from '@/hooks/useTenantPayments';
import { useAllUnits } from '@/hooks/useUnits';
import { useProperties } from '@/hooks/useProperties';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Wallet, Plus, Calculator, FileText, TrendingUp, TrendingDown, Users, PieChart, Pencil, Check, X, Printer, FileDown, Trash2, Settings } from 'lucide-react';
import { generateAccountsPDF } from '@/utils/pdfGenerator';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
    const num = Number(val);
    setAdminPercent(num);
    saveSetting('admin_share_percentage', val);
  };

  const handleWaqifPercentChange = (val: string) => {
    const num = Number(val);
    setWaqifPercent(num);
    saveSetting('waqif_share_percentage', val);
  };

  const handleFiscalYearChange = (val: string) => {
    setFiscalYear(val);
    saveSetting('fiscal_year', val);
  };

  const totalIncome = income.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  
  // VAT is now a manual field, no need to filter from expenses

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

  // === NEW FINANCIAL SEQUENCE ===
  const grandTotal = totalIncome + waqfCorpusPrevious;
  const netAfterExpenses = grandTotal - totalExpenses;
  const netAfterVat = netAfterExpenses - manualVat;
  const netAfterZakat = netAfterVat - zakatAmount;
  // أساس حساب الحصص = الدخل فقط - المصروفات - الزكاة (بدون رقبة الوقف وبدون الضريبة)
  const shareBase = totalIncome - totalExpenses - zakatAmount;
  const adminShare = shareBase * (adminPercent / 100);
  const waqifShare = shareBase * (waqifPercent / 100);
  const waqfRevenue = netAfterZakat - adminShare - waqifShare;
  const availableAmount = waqfRevenue - waqfCorpusManual;
  const remainingBalance = availableAmount - manualDistributions;

  // Group income by source
  const incomeBySource = income.reduce((acc, item) => {
    const source = item.source || 'غير محدد';
    acc[source] = (acc[source] || 0) + Number(item.amount);
    return acc;
  }, {} as Record<string, number>);

  // Group expenses by type
  const expensesByType = expenses.reduce((acc, item) => {
    const type = item.expense_type || 'غير محدد';
    acc[type] = (acc[type] || 0) + Number(item.amount);
    return acc;
  }, {} as Record<string, number>);

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

    // إرسال إشعارات تلقائية لجميع المستفيدين
    try {
      await supabase.rpc('notify_all_beneficiaries', {
        p_title: 'تحديث الحسابات الختامية',
        p_message: `تم تحديث الحسابات الختامية للسنة المالية ${fiscalYear}`,
        p_type: 'payment',
        p_link: '/beneficiary/accounts',
      });
      if (manualDistributions > 0) {
        await supabase.rpc('notify_all_beneficiaries', {
          p_title: 'تحديث التوزيعات المالية',
          p_message: `تم تحديث توزيعات الأرباح للسنة المالية ${fiscalYear}. يرجى مراجعة حصتك`,
          p_type: 'payment',
          p_link: '/beneficiary/my-share',
        });
      }
    } catch (e) {
      console.error('Failed to send notifications:', e);
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

        {/* Settings Bar */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">إعدادات:</span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">السنة المالية:</Label>
                <Input
                  value={fiscalYear}
                  onChange={(e) => handleFiscalYearChange(e.target.value)}
                  className="h-8 w-52"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">نسبة الناظر (%):</Label>
                <Input
                  type="number"
                  value={adminPercent}
                  onChange={(e) => handleAdminPercentChange(e.target.value)}
                  className="h-8 w-20"
                  min={0}
                  max={100}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">نسبة الواقف (%):</Label>
                <Input
                  type="number"
                  value={waqifPercent}
                  onChange={(e) => handleWaqifPercentChange(e.target.value)}
                  className="h-8 w-20"
                  min={0}
                  max={100}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">رقبة وقف مرحلة من عام سابق (ر.س):</Label>
                <Input
                  type="number"
                  value={waqfCorpusPrevious}
                  onChange={(e) => setWaqfCorpusPrevious(Number(e.target.value))}
                  className="h-8 w-28"
                  min={0}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">ضريبة القيمة المضافة (ر.س):</Label>
                <Input
                  type="number"
                  value={manualVat}
                  onChange={(e) => setManualVat(Number(e.target.value))}
                  className="h-8 w-28"
                  min={0}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">مبلغ الزكاة (ر.س):</Label>
                <Input
                  type="number"
                  value={zakatAmount}
                  onChange={(e) => setZakatAmount(Number(e.target.value))}
                  className="h-8 w-28"
                  min={0}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">رقبة الوقف للعام الحالي (ر.س):</Label>
                <Input
                  type="number"
                  value={waqfCorpusManual}
                  onChange={(e) => setWaqfCorpusManual(Number(e.target.value))}
                  className="h-8 w-28"
                  min={0}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">مبلغ التوزيعات (ر.س):</Label>
                <Input
                  type="number"
                  value={manualDistributions}
                  onChange={(e) => setManualDistributions(Number(e.target.value))}
                  className="h-8 w-28"
                  min={0}
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              ضريبة تجارية محسوبة (استرشادي): {calculatedVat.toLocaleString()} ر.س (من إيجارات {commercialRent.toLocaleString()} تجاري × {vatPercentage}%)
            </div>
          </CardContent>
        </Card>

        {/* 1. Current Summary */}
        <Card className="shadow-sm gradient-hero text-primary-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              ملخص الحسابات الحالية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {waqfCorpusPrevious > 0 && (
                <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                  <p className="text-sm text-primary-foreground/90">رقبة وقف مرحلة</p>
                  <p className="text-xl font-bold">{waqfCorpusPrevious.toLocaleString()}</p>
                </div>
              )}
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm text-primary-foreground/90">إجمالي الدخل</p>
                <p className="text-xl font-bold">{totalIncome.toLocaleString()}</p>
              </div>
              {waqfCorpusPrevious > 0 && (
                <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                  <p className="text-sm text-primary-foreground/90">الإجمالي الشامل</p>
                  <p className="text-xl font-bold">{grandTotal.toLocaleString()}</p>
                </div>
              )}
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm text-primary-foreground/90">المصروفات التشغيلية</p>
                <p className="text-xl font-bold">{totalExpenses.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm text-primary-foreground/90">الصافي بعد المصاريف</p>
                <p className="text-xl font-bold">{netAfterExpenses.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm text-primary-foreground/90">ضريبة القيمة المضافة</p>
                <p className="text-xl font-bold">{manualVat.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm text-primary-foreground/90">الصافي بعد الضريبة</p>
                <p className="text-xl font-bold">{netAfterVat.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm text-primary-foreground/90">الزكاة</p>
                <p className="text-xl font-bold">{zakatAmount.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm text-primary-foreground/90">حصة الناظر ({adminPercent}%)</p>
                <p className="text-xl font-bold">{adminShare.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm text-primary-foreground/90">حصة الواقف ({waqifPercent}%)</p>
                <p className="text-xl font-bold">{waqifShare.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm text-primary-foreground/90">ريع الوقف</p>
                <p className="text-xl font-bold">{waqfRevenue.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm text-primary-foreground/90">رقبة الوقف (الحالي)</p>
                <p className="text-xl font-bold">{waqfCorpusManual.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm text-primary-foreground/90">التوزيعات</p>
                <p className="text-xl font-bold">{manualDistributions.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm text-primary-foreground/90">الرصيد المتبقي</p>
                <p className="text-xl font-bold">{remainingBalance.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Contracts */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              العقود
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contracts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد عقود مسجلة</p>
            ) : (
              <Table className="min-w-[750px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right w-12">#</TableHead>
                    <TableHead className="text-right">رقم العقد</TableHead>
                    <TableHead className="text-right">المستأجر</TableHead>
                    <TableHead className="text-right">قيمة الدفعة</TableHead>
                    <TableHead className="text-right">عدد الدفعات</TableHead>
                    <TableHead className="text-right">الإيجار السنوي</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right w-20">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract, index) => (
                    <TableRow key={contract.id}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{contract.contract_number}</TableCell>
                      <TableCell>{contract.tenant_name}</TableCell>
                      <TableCell className="font-bold text-primary">{getPaymentPerPeriod(contract).toLocaleString()} ريال</TableCell>
                      <TableCell className="text-center">{getExpectedPayments(contract)}</TableCell>
                      <TableCell className="font-bold text-primary">{Number(contract.rent_amount).toLocaleString()} ريال</TableCell>
                      <TableCell>{statusLabel(contract.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenContractEdit(contract)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: 'contract', id: contract.id, name: `العقد ${contract.contract_number}` })}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/70 font-bold">
                    <TableCell>الإجمالي</TableCell>
                    <TableCell></TableCell>
                    <TableCell>{contracts.length} عقد</TableCell>
                    <TableCell className="text-primary font-bold">{totalPaymentPerPeriod.toLocaleString()} ريال</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-primary font-bold">{totalAnnualRent.toLocaleString()} ريال</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 2.5 Collection & Arrears Details */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              تفصيل التحصيل والمتأخرات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contracts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد عقود مسجلة</p>
            ) : (
              <Table className="min-w-[850px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right w-12">#</TableHead>
                    <TableHead className="text-right">المستأجر</TableHead>
                    <TableHead className="text-right">الإيجار الشهري</TableHead>
                    <TableHead className="text-right">الدفعات المتوقعة</TableHead>
                    <TableHead className="text-right">الدفعات المحصّلة</TableHead>
                    <TableHead className="text-right">الإجمالي المحصّل</TableHead>
                    <TableHead className="text-right">المتأخرات</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right w-24">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collectionData.map((item, idx) => {
                    const isEditing = editingIndex === idx;
                    const editRent = editData?.monthlyRent ?? item.paymentPerPeriod;
                    const editPaid = editData?.paidMonths ?? item.paidMonths;
                    const editTotal = editRent * editPaid;
                    const editArrears = (editRent * item.expectedPayments) - editTotal;

                    return (
                      <TableRow key={item.index}>
                        <TableCell className="text-muted-foreground">{item.index}</TableCell>
                        <TableCell className="font-medium">
                          {isEditing ? (
                            <Input
                              value={editData?.tenantName ?? ''}
                              onChange={(e) => setEditData(prev => prev ? { ...prev, tenantName: e.target.value } : prev)}
                              className="h-8 w-32"
                            />
                          ) : item.tenantName}
                        </TableCell>
                        <TableCell className="font-bold text-primary">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editData?.monthlyRent ?? 0}
                              onChange={(e) => setEditData(prev => prev ? { ...prev, monthlyRent: Number(e.target.value) } : prev)}
                              className="h-8 w-24"
                            />
                          ) : `${item.paymentPerPeriod.toLocaleString()} ريال`}
                        </TableCell>
                        <TableCell className="text-center">{item.expectedPayments}</TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              min={0}
                              max={12}
                              value={editData?.paidMonths ?? 0}
                              onChange={(e) => setEditData(prev => prev ? { ...prev, paidMonths: Number(e.target.value) } : prev)}
                              className="h-8 w-16"
                            />
                          ) : item.paidMonths}
                        </TableCell>
                        <TableCell className="font-bold text-primary">
                          {isEditing ? `${editTotal.toLocaleString()} ريال` : `${item.totalCollected.toLocaleString()} ريال`}
                        </TableCell>
                        <TableCell className={`font-bold ${(isEditing ? editArrears : item.arrears) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                          {(isEditing ? editArrears : item.arrears).toLocaleString()} ريال
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Select
                              value={editData?.status ?? 'متأخر'}
                              onValueChange={(val) => setEditData(prev => prev ? { ...prev, status: val } : prev)}
                            >
                              <SelectTrigger className="h-8 w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="مكتمل">مكتمل</SelectItem>
                                <SelectItem value="متأخر">متأخر</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'مكتمل' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {item.status}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => handleSaveEdit(idx)} disabled={updateContract.isPending || upsertPayment.isPending}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={handleCancelEdit}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleStartEdit(idx)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/70 font-bold">
                    <TableCell>الإجمالي</TableCell>
                    <TableCell>{contracts.length} مستأجر</TableCell>
                    <TableCell className="text-primary font-bold">{collectionData.reduce((sum, d) => sum + d.paymentPerPeriod, 0).toLocaleString()} ريال</TableCell>
                    <TableCell className="text-center">{totalExpectedPayments}</TableCell>
                    <TableCell className="text-center">{totalPaidMonths}</TableCell>
                    <TableCell className="text-primary font-bold">{totalCollectedAll.toLocaleString()} ريال</TableCell>
                    <TableCell className="text-destructive font-bold">{totalArrearsAll.toLocaleString()} ريال</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 3. Income Details */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              تفصيل الإيرادات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {income.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد إيرادات مسجلة</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">المصدر</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(incomeBySource).map(([source, amount]) => (
                      <TableRow key={source}>
                        <TableCell className="font-medium">{source}</TableCell>
                        <TableCell className="text-success">+{amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg flex justify-between items-center">
                  <span className="font-medium">إجمالي الإيرادات</span>
                  <span className="font-bold text-success">+{totalIncome.toLocaleString()} ريال</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 4. Expenses Details */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              تفصيل المصروفات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد مصروفات مسجلة</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">النوع</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(expensesByType).map(([type, amount]) => (
                      <TableRow key={type}>
                        <TableCell className="font-medium">{type}</TableCell>
                        <TableCell className="text-destructive">-{amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg flex justify-between items-center">
                  <span className="font-medium">إجمالي المصروفات</span>
                  <span className="font-bold text-destructive">-{totalExpenses.toLocaleString()} ريال</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 5. Distribution & Shares - NEW SEQUENCE */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              التوزيع والحصص
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">البند</TableHead>
                  <TableHead className="text-right">النسبة</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waqfCorpusPrevious > 0 && (
                  <TableRow>
                    <TableCell className="font-medium">رقبة الوقف المرحلة من العام السابق</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="font-bold text-success">{waqfCorpusPrevious.toLocaleString()}</TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-success/10">
                  <TableCell className="font-medium">إجمالي الدخل</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="font-bold text-success">{totalIncome.toLocaleString()}</TableCell>
                </TableRow>
                {waqfCorpusPrevious > 0 && (
                  <TableRow className="bg-success/20 font-semibold">
                    <TableCell className="font-bold">الإجمالي الشامل</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="font-bold text-success">{grandTotal.toLocaleString()}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell className="font-medium">(-) المصروفات التشغيلية</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="text-destructive">{totalExpenses.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell className="font-bold">الصافي بعد المصاريف</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="font-bold">{netAfterExpenses.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">(-) ضريبة القيمة المضافة</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="text-destructive">{manualVat.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell className="font-bold">الصافي بعد الضريبة</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="font-bold">{netAfterVat.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">(-) الزكاة</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="text-destructive">{zakatAmount.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell className="font-bold">الصافي بعد الزكاة</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="font-bold">{netAfterZakat.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">(-) حصة الناظر</TableCell>
                  <TableCell>{adminPercent}%</TableCell>
                  <TableCell>{adminShare.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">(-) حصة الواقف</TableCell>
                  <TableCell>{waqifPercent}%</TableCell>
                  <TableCell>{waqifShare.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow className="bg-primary/10 font-bold">
                  <TableCell className="font-bold">ريع الوقف (الإجمالي القابل للتوزيع)</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="text-primary font-bold">{waqfRevenue.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">(-) رقبة الوقف للعام الحالي</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>{waqfCorpusManual.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow className="bg-primary/5 font-bold">
                  <TableCell className="font-bold">المبلغ المتاح</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="text-primary font-bold">{availableAmount.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">(-) التوزيعات</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>{manualDistributions.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow className="bg-accent/20 font-bold">
                  <TableCell className="font-bold text-lg">الرصيد المتبقي</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className={`font-bold text-lg ${remainingBalance >= 0 ? 'text-success' : 'text-destructive'}`}>{remainingBalance.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 6. Beneficiary Distribution */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              توزيع حصص المستفيدين
            </CardTitle>
          </CardHeader>
          <CardContent>
            {beneficiaries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا يوجد مستفيدون مسجلون</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">المستفيد</TableHead>
                      <TableHead className="text-right">النسبة</TableHead>
                      <TableHead className="text-right">المبلغ المستحق</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {beneficiaries.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell>{Number(b.share_percentage).toFixed(6)}%</TableCell>
                        <TableCell className="text-primary font-medium">
                          {(manualDistributions * Number(b.share_percentage) / totalBeneficiaryPercentage).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg flex justify-between items-center">
                  <span className="font-medium">إجمالي التوزيع</span>
                  <span className="font-bold text-primary">
                    {manualDistributions.toLocaleString()} ريال
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 7. Previous Accounts */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>السجلات السابقة</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">جاري التحميل...</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="py-12 text-center">
                <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد حسابات ختامية مسجلة</p>
              </div>
            ) : (
              <Table className="min-w-[750px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">السنة المالية</TableHead>
                    <TableHead className="text-right">إجمالي الدخل</TableHead>
                    <TableHead className="text-right">إجمالي المصروفات</TableHead>
                    <TableHead className="text-right">حصة الناظر</TableHead>
                    <TableHead className="text-right">حصة الواقف</TableHead>
                    <TableHead className="text-right">ريع الوقف</TableHead>
                    <TableHead className="text-right w-20">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.fiscal_year}</TableCell>
                      <TableCell className="text-success">+{Number(account.total_income).toLocaleString()}</TableCell>
                      <TableCell className="text-destructive">-{Number(account.total_expenses).toLocaleString()}</TableCell>
                      <TableCell>{Number(account.admin_share).toLocaleString()}</TableCell>
                      <TableCell>{Number(account.waqif_share).toLocaleString()}</TableCell>
                      <TableCell className="text-primary font-medium">{Number(account.waqf_revenue).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: 'account', id: account.id, name: `حساب ${account.fiscal_year}` })} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف {deleteTarget?.name} نهائياً ولا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                تأكيد الحذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Contract Edit Dialog */}
        <Dialog open={contractEditOpen} onOpenChange={setContractEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>تعديل العقد {editingContractData?.contract_number}</DialogTitle>
              <DialogDescription className="sr-only">نموذج تعديل بيانات العقد</DialogDescription>
            </DialogHeader>
            {editingContractData && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>اسم المستأجر</Label>
                  <Input
                    value={editingContractData.tenant_name}
                    onChange={(e) => setEditingContractData((prev) => prev ? { ...prev, tenant_name: e.target.value } : prev)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>قيمة الإيجار (ر.س)</Label>
                  <Input
                    type="number"
                    value={editingContractData.rent_amount}
                    onChange={(e) => setEditingContractData((prev) => prev ? { ...prev, rent_amount: Number(e.target.value) } : prev)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>الحالة</Label>
                  <Select value={editingContractData.status} onValueChange={(val) => setEditingContractData((prev) => prev ? { ...prev, status: val } : prev)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="expired">منتهي</SelectItem>
                      <SelectItem value="cancelled">ملغي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button className="flex-1 gradient-primary" onClick={handleSaveContractEdit} disabled={updateContract.isPending}>
                    تحديث
                  </Button>
                  <Button variant="outline" onClick={() => setContractEditOpen(false)}>
                    إلغاء
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AccountsPage;
