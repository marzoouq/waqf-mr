import { useState, useMemo } from 'react';
import { EXPIRING_SOON_DAYS } from '@/constants';
import { safeNumber } from '@/utils/safeNumber';
import DashboardLayout from '@/components/DashboardLayout';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NativeSelect } from '@/components/ui/native-select';
import { useCreateContract, useUpdateContract, useDeleteContract, useContractsByFiscalYear } from '@/hooks/useContracts';
import { useProperties } from '@/hooks/useProperties';
import { usePaymentInvoices } from '@/hooks/usePaymentInvoices';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useContractAllocations } from '@/hooks/useContractAllocations';

import { Contract } from '@/types/database';
import { FileText, Search, Lock, Info, RefreshCw, CheckSquare, Square, CheckCircle, BarChart3, Receipt, Plus, ChevronsUpDown, Filter, CalendarDays } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeaderCard from '@/components/PageHeaderCard';
import ContractAccordionGroup from '@/components/contracts/ContractAccordionGroup';
import { TableSkeleton } from '@/components/SkeletonLoaders';
import TablePagination from '@/components/TablePagination';
import ExportMenu from '@/components/ExportMenu';
import { generateContractsPDF } from '@/utils/pdf';
import { buildCsv, downloadCsv } from '@/utils/csv';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ContractStatsCards from '@/components/contracts/ContractStatsCards';
import ContractFormDialog from '@/components/contracts/ContractFormDialog';
import { emptyFormData, type ContractFormData } from '@/components/contracts/contractForm.types';
import CollectionReport from '@/components/contracts/CollectionReport';
import PaymentInvoicesTab from '@/components/contracts/PaymentInvoicesTab';
import MonthlyAccrualTable from '@/components/contracts/MonthlyAccrualTable';

import { getPaymentTypeLabel } from '@/utils/contractHelpers';

const ContractsPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYears, isClosed, setFiscalYearId, isSpecificYear } = useFiscalYear();


  const { data: contracts = [], isLoading } = useContractsByFiscalYear(fiscalYearId);
  const { data: properties = [] } = useProperties();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();
  // جلب فواتير الدفعات لتحديد التحصيل الفعلي (مصدر الحقيقة الوحيد)
  const { data: paymentInvoices = [] } = usePaymentInvoices(fiscalYearId);

  // بناء خريطة الدفعات المسددة من الفواتير (المصدر الوحيد)
  const invoicePaidMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of paymentInvoices) {
      if (inv.status === 'paid') {
        map.set(inv.contract_id, (map.get(inv.contract_id) ?? 0) + 1);
      }
    }
    return map;
  }, [paymentInvoices]);

  const [isOpen, setIsOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [bulkRenewOpen, setBulkRenewOpen] = useState(false);
  const [bulkRenewing, setBulkRenewing] = useState(false);
  const [selectedForRenewal, setSelectedForRenewal] = useState<Set<string>>(new Set());
  const [formInitialData, setFormInitialData] = useState<ContractFormData>(emptyFormData);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'overdue'>('all');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('contracts');
  const ITEMS_PER_PAGE = 10;

  const resetForm = () => {
    setEditingContract(null);
    setFormInitialData(emptyFormData);
  };

  const handleRenew = (contract: Contract) => {
    const num = contract.contract_number;
    const match = num.match(/-R(\d+)$/);
    const newNumber = match ? num.replace(/-R(\d+)$/, `-R${parseInt(match[1]) + 1}`) : `${num}-R1`;
    setFormInitialData({
      contract_number: newNumber,
      property_id: contract.property_id,
      unit_id: contract.unit_id || '',
      tenant_name: contract.tenant_name,
      start_date: '',
      end_date: '',
      rent_amount: contract.rent_amount.toString(),
      status: 'active',
      notes: `تجديد للعقد ${contract.contract_number}`,
      payment_type: contract.payment_type || 'annual',
      payment_count: (contract.payment_count || 1).toString(),
      rental_mode: 'single', selected_unit_ids: [], pricing_mode: 'total', rent_per_unit: {}, vat_applicable: false,
      tenant_id_type: 'NAT', tenant_id_number: '', tenant_tax_number: '', tenant_crn: '', tenant_street: '', tenant_building: '', tenant_district: '', tenant_city: '', tenant_postal_code: '',
    });
    setEditingContract(null);
    setIsOpen(true);
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setFormInitialData({
      contract_number: contract.contract_number, property_id: contract.property_id, unit_id: contract.unit_id || '', tenant_name: contract.tenant_name,
      start_date: contract.start_date, end_date: contract.end_date, rent_amount: contract.rent_amount.toString(),
      status: contract.status, notes: contract.notes || '',
      payment_type: contract.payment_type || 'annual', payment_count: (contract.payment_count || 1).toString(),
      rental_mode: contract.unit_id ? 'single' : 'full', selected_unit_ids: [], pricing_mode: 'total', rent_per_unit: {}, vat_applicable: false,
      tenant_id_type: contract.tenant_id_type || 'NAT', tenant_id_number: contract.tenant_id_number || '', tenant_tax_number: contract.tenant_tax_number || '', tenant_crn: contract.tenant_crn || '', tenant_street: contract.tenant_street || '', tenant_building: contract.tenant_building || '', tenant_district: contract.tenant_district || '', tenant_city: contract.tenant_city || '', tenant_postal_code: contract.tenant_postal_code || '',
    });
    setIsOpen(true);
  };

  const handleFormSubmit = async (formData: ContractFormData, isEditing: boolean) => {
    const paymentCount = formData.payment_type === 'monthly' ? 12 : formData.payment_type === 'quarterly' ? 4 : formData.payment_type === 'semi_annual' ? 2 : (formData.payment_type === 'annual' ? 1 : parseInt(formData.payment_count) || 1);

    if (isEditing && editingContract) {
      const rentAmount = parseFloat(formData.rent_amount);
      const paymentAmount = rentAmount / paymentCount;
      const contractData: Record<string, unknown> = {
        contract_number: formData.contract_number, property_id: formData.property_id, unit_id: formData.unit_id || null, tenant_name: formData.tenant_name,
        start_date: formData.start_date, end_date: formData.end_date, rent_amount: rentAmount,
        status: formData.status, notes: formData.notes || undefined,
        payment_type: formData.payment_type, payment_count: paymentCount, payment_amount: paymentAmount,
        tenant_id_type: formData.tenant_id_type || 'NAT', tenant_id_number: formData.tenant_id_number || null,
        tenant_tax_number: formData.tenant_tax_number || null, tenant_crn: formData.tenant_crn || null,
        tenant_street: formData.tenant_street || null, tenant_building: formData.tenant_building || null,
        tenant_district: formData.tenant_district || null, tenant_city: formData.tenant_city || null, tenant_postal_code: formData.tenant_postal_code || null,
      };
      await updateContract.mutateAsync({ id: editingContract.id, ...contractData } as unknown as Parameters<typeof updateContract.mutateAsync>[0]);
      return;
    }

    // Use selected fiscal year from context, fallback to active FY
    const contextFYId = fiscalYearId && fiscalYearId !== 'all' ? fiscalYearId : null;
    let activeFYId = contextFYId;
    if (!activeFYId) {
      const { data: activeFY } = await supabase
        .from('fiscal_years').select('id').eq('status', 'active').limit(1).maybeSingle();
      activeFYId = activeFY?.id || null;
    }
    const activeFY = activeFYId ? { id: activeFYId } : null;

    const suffixLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    if (formData.rental_mode === 'multi' && formData.selected_unit_ids.length > 1) {
      const units = formData.selected_unit_ids;
      let created = 0;
      for (let i = 0; i < units.length; i++) {
        const unitId = units[i];
        const contractNumber = `${formData.contract_number}-${suffixLetters[i] || (i + 1)}`;
        let rentAmount: number;
        if (formData.pricing_mode === 'per_unit') {
          rentAmount = parseFloat(formData.rent_per_unit[unitId]) || 0;
        } else {
          rentAmount = parseFloat(formData.rent_amount) / units.length;
        }
        const paymentAmount = rentAmount / paymentCount;
        const contractData: Record<string, unknown> = {
          contract_number: contractNumber, property_id: formData.property_id, unit_id: unitId, tenant_name: formData.tenant_name,
          start_date: formData.start_date, end_date: formData.end_date, rent_amount: rentAmount,
          status: formData.status, notes: formData.notes || undefined,
          payment_type: formData.payment_type, payment_count: paymentCount, payment_amount: paymentAmount,
          fiscal_year_id: activeFY?.id || null,
          tenant_id_type: formData.tenant_id_type || 'NAT', tenant_id_number: formData.tenant_id_number || null,
          tenant_tax_number: formData.tenant_tax_number || null, tenant_crn: formData.tenant_crn || null,
          tenant_street: formData.tenant_street || null, tenant_building: formData.tenant_building || null,
          tenant_district: formData.tenant_district || null, tenant_city: formData.tenant_city || null, tenant_postal_code: formData.tenant_postal_code || null,
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
        unit_id: (formData.rental_mode === 'single' ? formData.unit_id : (formData.rental_mode === 'multi' && formData.selected_unit_ids.length === 1 ? formData.selected_unit_ids[0] : null)) || null,
        tenant_name: formData.tenant_name,
        start_date: formData.start_date, end_date: formData.end_date, rent_amount: rentAmount,
        status: formData.status, notes: formData.notes || undefined,
        payment_type: formData.payment_type, payment_count: paymentCount, payment_amount: paymentAmount,
        tenant_id_type: formData.tenant_id_type || 'NAT', tenant_id_number: formData.tenant_id_number || null,
        tenant_tax_number: formData.tenant_tax_number || null, tenant_crn: formData.tenant_crn || null,
        tenant_street: formData.tenant_street || null, tenant_building: formData.tenant_building || null,
        tenant_district: formData.tenant_district || null, tenant_city: formData.tenant_city || null, tenant_postal_code: formData.tenant_postal_code || null,
      };
      if (activeFY?.id) contractData.fiscal_year_id = activeFY.id;
      await createContract.mutateAsync(contractData as unknown as Parameters<typeof createContract.mutateAsync>[0]);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteContract.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const expiredContracts = useMemo(() => contracts.filter(c => c.status === 'expired'), [contracts]);

  const toggleSelection = (id: string) => {
    setSelectedForRenewal(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAllExpired = () => setSelectedForRenewal(new Set(expiredContracts.map(c => c.id)));
  const deselectAll = () => setSelectedForRenewal(new Set());

  const handleBulkRenew = async () => {
    setBulkRenewing(true);
    try {
      const { data: activeFY } = await supabase
        .from('fiscal_years').select('id').eq('status', 'active').limit(1).maybeSingle();

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
        const newNumber = match ? num.replace(/-R(\d+)$/, `-R${parseInt(match[1]) + 1}`) : `${num}-R1`;
        const paymentCount = contract.payment_type === 'monthly' ? 12 : contract.payment_type === 'quarterly' ? 4 : contract.payment_type === 'semi_annual' ? 2 : (contract.payment_type === 'annual' ? 1 : (contract.payment_count || 1));
        const paymentAmount = safeNumber(contract.rent_amount) / paymentCount;

        const newContract: Record<string, unknown> = {
          contract_number: newNumber, property_id: contract.property_id, unit_id: contract.unit_id || null,
          tenant_name: contract.tenant_name, start_date: startDate, end_date: endDate,
          rent_amount: contract.rent_amount, status: 'active',
          notes: `تجديد جماعي للعقد ${contract.contract_number}`,
          payment_type: contract.payment_type || 'annual', payment_count: paymentCount, payment_amount: paymentAmount,
          fiscal_year_id: activeFY?.id || null,
        };
        await createContract.mutateAsync(newContract as unknown as Parameters<typeof createContract.mutateAsync>[0]);
        created++;
      }

      await supabase.rpc('notify_admins', { p_title: 'تجديد جماعي للعقود', p_message: `تم تجديد ${created} عقد منتهي بنجاح`, p_type: 'success', p_link: '/dashboard/contracts' });
      await supabase.rpc('notify_all_beneficiaries', { p_title: 'تجديد عقود الإيجار', p_message: `تم تجديد ${created} عقد إيجار للسنة الجديدة`, p_type: 'info', p_link: '/beneficiary/notifications' });
      toast.success(`تم تجديد ${created} عقد بنجاح`);
    } catch {
      toast.error('حدث خطأ أثناء التجديد');
    } finally {
      setBulkRenewing(false);
      setBulkRenewOpen(false);
      setSelectedForRenewal(new Set());
    }
  };
  // تجميع العقود حسب الرقم الأساسي (بدون -R1, -R2, ...)
  const getBaseNumber = (num: string) => num.replace(/-R\d+$/, '');

  const groupedContracts = useMemo(() => {
    const map = new Map<string, Contract[]>();
    for (const c of contracts) {
      const base = getBaseNumber(c.contract_number);
      if (!map.has(base)) map.set(base, []);
      map.get(base)!.push(c);
    }
    // ترتيب العقود داخل كل مجموعة: الأحدث أولاً
    for (const [, group] of map) {
      group.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    }
    // ترتيب المجموعات: الأحدث أولاً
    return [...map.entries()].sort((a, b) => {
      const latestA = new Date(a[1][0].start_date).getTime();
      const latestB = new Date(b[1][0].start_date).getTime();
      return latestB - latestA;
    });
  }, [contracts]);

  // C-5: حساب العقود المتأخرة عن السداد > 30 يوم
  const overdueContractIds = useMemo(() => {
    const ids = new Set<string>();
    const now = Date.now();
    const thirtyDays = 30 * 24 * 3600 * 1000;
    for (const inv of paymentInvoices) {
      if (inv.status === 'overdue' || (inv.status === 'pending' && new Date(inv.due_date).getTime() + thirtyDays < now)) {
        ids.add(inv.contract_id);
      }
    }
    return ids;
  }, [paymentInvoices]);

  // عدد العقود النشطة والمنتهية والمتأخرة (لعرض الأعداد بجانب الفلتر)
  const statusCounts = useMemo(() => {
    let active = 0, expired = 0;
    for (const [, group] of groupedContracts) {
      const latestStatus = group[0].status;
      if (latestStatus === 'active') active++;
      else expired++;
    }
    // عدد المجموعات التي تحتوي على عقد متأخر
    const overdue = groupedContracts.filter(([, group]) =>
      group.some(c => overdueContractIds.has(c.id))
    ).length;
    return { active, expired, all: groupedContracts.length, overdue };
  }, [groupedContracts, overdueContractIds]);

  // فلترة المجموعات حسب البحث + حالة أحدث عقد
  const filteredGroups = useMemo(() => {
    let result = groupedContracts;
    // فلتر الحالة
    if (statusFilter === 'overdue') {
      // C-5: عرض العقود المتأخرة عن السداد فقط
      result = result.filter(([, group]) =>
        group.some(c => overdueContractIds.has(c.id))
      );
    } else if (statusFilter !== 'all') {
      result = result.filter(([, group]) => {
        const latestStatus = group[0].status;
        return statusFilter === 'active' ? latestStatus === 'active' : latestStatus !== 'active';
      });
    }
    // C-8: فلتر العقار
    if (propertyFilter !== 'all') {
      result = result.filter(([, group]) =>
        group.some(c => c.property_id === propertyFilter)
      );
    }
    // C-8: فلتر نوع الدفع
    if (paymentTypeFilter !== 'all') {
      result = result.filter(([, group]) =>
        group.some(c => c.payment_type === paymentTypeFilter)
      );
    }
    // فلتر البحث
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(([, group]) =>
        group.some(c =>
          c.contract_number.toLowerCase().includes(q) ||
          c.tenant_name.toLowerCase().includes(q) ||
          (c.notes || '').toLowerCase().includes(q) ||
          getPaymentTypeLabel(c.payment_type).includes(q)
        )
      );
    }
    return result;
  }, [groupedContracts, searchQuery, statusFilter, propertyFilter, paymentTypeFilter, overdueContractIds]);

  const allExpanded = filteredGroups.length > 0 && expandedGroups.size >= filteredGroups.length;
  const toggleAllGroups = () => {
    if (allExpanded) {
      setExpandedGroups(new Set());
    } else {
      setExpandedGroups(new Set(filteredGroups.map(([base]) => base)));
    }
  };

  const expiredIds = useMemo(() => new Set(expiredContracts.map(c => c.id)), [expiredContracts]);

  const { data: contractAllocations = [] } = useContractAllocations(isSpecificYear ? fiscalYearId : undefined);

  const stats = useMemo(() => {
    const active = contracts.filter(c => c.status === 'active');
    const expired = contracts.filter(c => c.status === 'expired');

    // استخدام allocated_amount عند وجود سنة مالية محددة (المبلغ المخصص فعلياً)
    let totalRent: number;
    let activeRent: number;
    if (isSpecificYear && contractAllocations.length > 0) {
      const allocMap = new Map<string, number>();
      contractAllocations.forEach(a => {
        allocMap.set(a.contract_id, (allocMap.get(a.contract_id) ?? 0) + safeNumber(a.allocated_amount));
      });
      totalRent = contracts.reduce((sum, c) => sum + (allocMap.get(c.id) ?? 0), 0);
      activeRent = active.reduce((sum, c) => sum + (allocMap.get(c.id) ?? 0), 0);
    } else {
      totalRent = contracts.reduce((sum, c) => sum + safeNumber(c.rent_amount), 0);
      activeRent = active.reduce((sum, c) => sum + safeNumber(c.rent_amount), 0);
    }

    const now = new Date().getTime();
    const soon = active.filter(c => {
      const days = (new Date(c.end_date).getTime() - now) / (1000 * 3600 * 24);
      return days > 0 && days <= EXPIRING_SOON_DAYS;
    });
    const activePercent = contracts.length > 0 ? Math.round((active.length / contracts.length) * 100) : 0;
    return { total: contracts.length, active: active.length, activePercent, expired: expired.length, totalRent, activeRent, expiringSoon: soon.length };
  }, [contracts, contractAllocations, isSpecificYear]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="إدارة العقود"
          icon={FileText}
          description="عرض وإدارة عقود الإيجار"
          actions={<>
            <ExportMenu onExportPdf={() => generateContractsPDF(contracts, pdfWaqfInfo)} onExportCsv={() => {
              const csv = buildCsv(contracts.map(c => ({
                'رقم العقد': c.contract_number,
                'المستأجر': c.tenant_name,
                'الإيجار السنوي': safeNumber(c.rent_amount),
                'تاريخ البداية': c.start_date,
                'تاريخ النهاية': c.end_date,
                'نوع الدفع': getPaymentTypeLabel(c.payment_type),
                'الحالة': c.status === 'active' ? 'ساري' : 'منتهي',
              })));
              downloadCsv(csv, 'عقود.csv');
              toast.success('تم تصدير العقود بنجاح');
            }} />
            <Button className="gradient-primary gap-2" onClick={() => { resetForm(); setIsOpen(true); }}><Plus className="w-4 h-4" />إضافة عقد</Button>
          </>}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Select للجوال */}
          <NativeSelect
            value={activeTab}
            onValueChange={setActiveTab}
            options={[
              { value: 'contracts', label: 'العقود' },
              { value: 'accruals', label: 'الاستحقاقات الشهرية' },
              { value: 'invoices', label: 'فواتير الدفعات' },
              { value: 'collection', label: 'تقرير التحصيل' },
            ]}
            className="md:hidden"
          />
          <TabsList className="hidden md:grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="contracts" className="gap-2"><FileText className="w-4 h-4" />العقود</TabsTrigger>
            <TabsTrigger value="accruals" className="gap-2"><CalendarDays className="w-4 h-4" />الاستحقاقات</TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2"><Receipt className="w-4 h-4" />فواتير الدفعات</TabsTrigger>
            <TabsTrigger value="collection" className="gap-2"><BarChart3 className="w-4 h-4" />تقرير التحصيل</TabsTrigger>
          </TabsList>

          <TabsContent value="contracts" className="space-y-5">
            <ContractStatsCards stats={stats} isLoading={isLoading} />

        {/* شريط تنبيه العقود المنتهية */}
        {expiredContracts.length > 0 && (
          <Alert className="border-destructive/40 bg-destructive/10">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-destructive font-medium">
                يوجد {expiredContracts.length} عقد منتهي
                {selectedForRenewal.size > 0 && <span className="text-foreground mr-1">— تم اختيار {selectedForRenewal.size}</span>}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={selectedForRenewal.size === expiredContracts.length ? deselectAll : selectAllExpired}>
                  {selectedForRenewal.size === expiredContracts.length ? <Square className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
                  {selectedForRenewal.size === expiredContracts.length ? 'إلغاء التحديد' : 'تحديد الكل'}
                </Button>
                {selectedForRenewal.size > 0 && (
                  <Button size="sm" variant="destructive" className="gap-2 shrink-0" onClick={() => setBulkRenewOpen(true)}>
                    <RefreshCw className="w-4 h-4" />تجديد المختارة ({selectedForRenewal.size})
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-start sm:items-center gap-3">
          <div className="relative w-full sm:max-w-md sm:flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث في العقود..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-10" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-48 shrink-0">
              <Filter className="w-4 h-4 ml-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل ({statusCounts.all})</SelectItem>
              <SelectItem value="active">نشط ({statusCounts.active})</SelectItem>
              <SelectItem value="expired">منتهي ({statusCounts.expired})</SelectItem>
              <SelectItem value="overdue">متأخر &gt; 30 يوم ({statusCounts.overdue})</SelectItem>
            </SelectContent>
          </Select>
          <Select value={propertyFilter} onValueChange={(v) => { setPropertyFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-48 shrink-0">
              <SelectValue placeholder="كل العقارات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل العقارات</SelectItem>
              {properties.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.property_number} - {p.location}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentTypeFilter} onValueChange={(v) => { setPaymentTypeFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-40 shrink-0">
              <SelectValue placeholder="نوع الدفع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              <SelectItem value="monthly">شهري</SelectItem>
              <SelectItem value="quarterly">ربع سنوي</SelectItem>
              <SelectItem value="semi_annual">نصف سنوي</SelectItem>
              <SelectItem value="annual">سنوي</SelectItem>
            </SelectContent>
          </Select>
          {filteredGroups.length > 0 && (
            <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={toggleAllGroups}>
              <ChevronsUpDown className="w-4 h-4" />
              {allExpanded ? 'طي الكل' : 'توسيع الكل'}
            </Button>
          )}
        </div>

        {isClosed && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-warning/30 bg-warning/10 text-warning text-sm">
            <Lock className="w-4 h-4 shrink-0" /><span>سنة مقفلة - تعديل بصلاحية الناظر</span>
          </div>
        )}

        {/* عرض العقود المُجمَّعة */}
        {isLoading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : filteredGroups.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد عقود مسجلة'}</p>
            {!searchQuery && contracts.length === 0 && fiscalYearId !== 'all' && fiscalYears.length > 1 && (
              <div className="mt-4 mx-auto max-w-md flex items-center gap-2 p-3 rounded-lg border border-info/30 bg-info/10 text-info text-sm">
                <Info className="w-4 h-4 shrink-0" />
                <span>
                  لا توجد عقود في هذه السنة المالية. جرّب التبديل إلى{' '}
                  <button type="button" className="underline font-semibold hover:opacity-80" onClick={() => setFiscalYearId('all')}>جميع السنوات</button>
                  {' '}أو اختر سنة مالية أخرى من القائمة أعلاه.
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGroups
              .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
              .map(([baseNumber, group]) => (
                <ContractAccordionGroup
                  key={baseNumber}
                  baseNumber={baseNumber}
                  contracts={group}
                  invoices={paymentInvoices}
                  invoicePaidMap={invoicePaidMap}
                  expiredIds={expiredIds}
                  selectedForRenewal={selectedForRenewal}
                  onToggleSelection={toggleSelection}
                  onEdit={handleEdit}
                  onDelete={(c) => setDeleteTarget({ id: c.id, name: `العقد ${c.contract_number}` })}
                  onRenew={handleRenew}
                  isClosed={isClosed}
                  open={expandedGroups.has(baseNumber)}
                  onOpenChange={(isOpen) => {
                    setExpandedGroups(prev => {
                      const next = new Set(prev);
                      if (isOpen) next.add(baseNumber); else next.delete(baseNumber);
                      return next;
                    });
                  }}
                />
              ))}
            <TablePagination currentPage={currentPage} totalItems={filteredGroups.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
          </div>
        )}
          </TabsContent>

          <TabsContent value="accruals">
            <MonthlyAccrualTable contracts={contracts} paymentInvoices={paymentInvoices} isLoading={isLoading} fiscalYearId={fiscalYearId} fiscalYear={fiscalYears?.find(fy => fy.id === fiscalYearId) ?? null} />
          </TabsContent>

          <TabsContent value="invoices">
            <PaymentInvoicesTab fiscalYearId={fiscalYearId} isClosed={isClosed} />
          </TabsContent>

          <TabsContent value="collection">
            <CollectionReport contracts={contracts} paymentInvoices={paymentInvoices} isLoading={isLoading} fiscalYears={fiscalYears} fiscalYearId={fiscalYearId} />
          </TabsContent>
        </Tabs>

        {/* Contract Form Dialog */}
        <ContractFormDialog
          open={isOpen}
          onOpenChange={setIsOpen}
          editingContract={editingContract}
          properties={properties}
          activeContracts={contracts}
          onSubmit={handleFormSubmit}
          onReset={resetForm}
          isPending={createContract.isPending || updateContract.isPending}
          initialFormData={formInitialData}
        />

        {/* حوار تأكيد تجديد العقود المختارة */}
        <AlertDialog open={bulkRenewOpen} onOpenChange={setBulkRenewOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تجديد العقود المختارة ({selectedForRenewal.size})</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>سيتم إنشاء عقود جديدة بنفس البيانات مع تواريخ تبدأ من تاريخ انتهاء العقد السابق وبنفس المدة للعقود التالية:</p>
                  <ul className="max-h-40 overflow-y-auto space-y-1 text-sm pr-2">
                    {expiredContracts.filter(c => selectedForRenewal.has(c.id)).map(c => (
                      <li key={c.id} className="flex items-center gap-2 py-1 border-b border-border/50 last:border-0">
                        <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                        <span className="font-medium">{c.contract_number}</span>
                        <span className="text-muted-foreground">— {c.tenant_name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogCancel disabled={bulkRenewing}>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkRenew} disabled={bulkRenewing} className="bg-success text-success-foreground hover:bg-success/90 gap-2">
                {bulkRenewing ? 'جاري التجديد...' : <><RefreshCw className="w-4 h-4" />تأكيد التجديد ({selectedForRenewal.size})</>}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
              <AlertDialogDescription>سيتم حذف {deleteTarget?.name} نهائياً ولا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">تأكيد الحذف</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default ContractsPage;
