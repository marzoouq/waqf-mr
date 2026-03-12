import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateContract, useUpdateContract, useDeleteContract, useContractsByFiscalYear } from '@/hooks/useContracts';
import { useProperties } from '@/hooks/useProperties';
import { usePaymentInvoices } from '@/hooks/usePaymentInvoices';
import { useFiscalYear } from '@/contexts/FiscalYearContext';

import { Contract } from '@/types/database';
import { Trash2, FileText, Edit, Search, Lock, Info, RefreshCw, CheckSquare, Square, CheckCircle, BarChart3, Receipt, Plus } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import { Checkbox } from '@/components/ui/checkbox';
import { TableSkeleton } from '@/components/SkeletonLoaders';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TablePagination from '@/components/TablePagination';
import ExportMenu from '@/components/ExportMenu';
import { generateContractsPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ContractStatsCards from '@/components/contracts/ContractStatsCards';
import ContractFormDialog, { ContractFormData, emptyFormData } from '@/components/contracts/ContractFormDialog';
import CollectionReport from '@/components/contracts/CollectionReport';
import PaymentInvoicesTab from '@/components/contracts/PaymentInvoicesTab';

const ContractsPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear, fiscalYears, isClosed, setFiscalYearId } = useFiscalYear();

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
      tenant_id_type: contract.tenant_id_type || 'NAT', tenant_id_number: contract.tenant_id_number || '', tenant_tax_number: (contract as any).tenant_tax_number || '', tenant_crn: (contract as any).tenant_crn || '', tenant_street: contract.tenant_street || '', tenant_building: contract.tenant_building || '', tenant_district: contract.tenant_district || '', tenant_city: contract.tenant_city || '', tenant_postal_code: contract.tenant_postal_code || '',
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
        const paymentAmount = Number(contract.rent_amount) / paymentCount;

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
    } catch (err) {
      toast.error('حدث خطأ أثناء التجديد');
    } finally {
      setBulkRenewing(false);
      setBulkRenewOpen(false);
      setSelectedForRenewal(new Set());
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="px-2 py-1 rounded-full text-xs bg-success/20 text-success">نشط</span>;
      case 'expired': return <span className="px-2 py-1 rounded-full text-xs bg-destructive/20 text-destructive">منتهي</span>;
      case 'pending': return <span className="px-2 py-1 rounded-full text-xs bg-warning/20 text-warning">معلق</span>;
      default: return <span className="px-2 py-1 rounded-full text-xs bg-muted">{status}</span>;
    }
  };

  const getPaymentTypeLabel = (type?: string) => type === 'monthly' ? 'شهري' : type === 'quarterly' ? 'ربعي' : type === 'semi_annual' ? 'نصف سنوي' : type === 'annual' ? 'سنوي' : 'متعدد';

  const filteredContracts = contracts.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.contract_number.toLowerCase().includes(q) || c.tenant_name.toLowerCase().includes(q) || (c.notes || '').toLowerCase().includes(q) || getPaymentTypeLabel(c.payment_type).includes(q);
  });

  const stats = useMemo(() => {
    const active = contracts.filter(c => c.status === 'active');
    const expired = contracts.filter(c => c.status === 'expired');
    const totalRent = contracts.reduce((sum, c) => sum + (Number(c.rent_amount) || 0), 0);
    const activeRent = active.reduce((sum, c) => sum + (Number(c.rent_amount) || 0), 0);
    const now = new Date().getTime();
    const soon = active.filter(c => {
      const days = (new Date(c.end_date).getTime() - now) / (1000 * 3600 * 24);
      return days > 0 && days <= 90;
    });
    const activePercent = contracts.length > 0 ? Math.round((active.length / contracts.length) * 100) : 0;
    return { total: contracts.length, active: active.length, activePercent, expired: expired.length, totalRent, activeRent, expiringSoon: soon.length };
  }, [contracts]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="إدارة العقود"
          icon={FileText}
          description="عرض وإدارة عقود الإيجار"
          actions={<>
            <ExportMenu onExportPdf={() => generateContractsPDF(contracts, pdfWaqfInfo)} />
            <Button className="gradient-primary gap-2" onClick={() => { resetForm(); setIsOpen(true); }}><Plus className="w-4 h-4" />إضافة عقد</Button>
          </>}
        />

        <Tabs defaultValue="contracts" className="space-y-4">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="contracts" className="gap-2"><FileText className="w-4 h-4" />العقود</TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2"><Receipt className="w-4 h-4" /><span className="hidden sm:inline">فواتير الدفعات</span><span className="sm:hidden">الفواتير</span></TabsTrigger>
            <TabsTrigger value="collection" className="gap-2"><BarChart3 className="w-4 h-4" /><span className="hidden sm:inline">تقرير التحصيل</span><span className="sm:hidden">التحصيل</span></TabsTrigger>
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

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث في العقود..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-10" />
          </div>
        </div>

        {isClosed && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-warning/30 bg-warning/10 text-warning text-sm">
            <Lock className="w-4 h-4 shrink-0" /><span>سنة مقفلة - تعديل بصلاحية الناظر</span>
          </div>
        )}

        <Card className="shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <TableSkeleton rows={5} cols={6} />
            ) : filteredContracts.length === 0 ? (
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
              <>
                {/* Mobile Cards */}
                <div className="space-y-3 md:hidden px-3 py-2">
                  {filteredContracts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((contract) => (
                    <Card key={contract.id} className="shadow-sm">
                      <CardContent className="p-4 space-y-3">
                        {contract.status === 'expired' && (
                          <div className="flex items-center gap-2 pb-2 border-b border-destructive/20">
                            <Checkbox checked={selectedForRenewal.has(contract.id)} onCheckedChange={() => toggleSelection(contract.id)} />
                            <span className="text-xs text-destructive">اختر للتجديد</span>
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm">{contract.contract_number}</span>
                              {getStatusBadge(contract.status)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{contract.tenant_name}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="w-8 h-8 text-success hover:text-success/80" onClick={() => handleRenew(contract)} title="تجديد العقد" aria-label="تجديد العقد"><RefreshCw className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleEdit(contract)} aria-label="تعديل"><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: contract.id, name: `العقد ${contract.contract_number}` })} aria-label="حذف"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          <div><p className="text-[10px] text-muted-foreground">العقار</p><p className="text-sm font-medium">{contract.property?.property_number || '-'}</p></div>
                          <div><p className="text-[10px] text-muted-foreground">الوحدة</p><p className="text-sm font-medium">{contract.unit ? `وحدة ${contract.unit.unit_number}` : 'كامل'}</p></div>
                          <div><p className="text-[10px] text-muted-foreground">البداية</p><p className="text-sm font-medium">{contract.start_date}</p></div>
                          <div><p className="text-[10px] text-muted-foreground">النهاية</p><p className="text-sm font-medium">{contract.end_date}</p></div>
                          <div><p className="text-[10px] text-muted-foreground">الإيجار السنوي</p><p className="text-sm font-medium">{Number(contract.rent_amount).toLocaleString()} ر.س</p></div>
                          <div><p className="text-[10px] text-muted-foreground">نوع الدفع</p><p className="text-sm font-medium">{getPaymentTypeLabel(contract.payment_type)}</p></div>
                        </div>
                        {/* التحصيل (من الفواتير) */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-xs text-muted-foreground">التحصيل</span>
                          {(() => {
                            const paymentCount = contract.payment_type === 'monthly' ? 12 : (contract.payment_type === 'annual' ? 1 : (contract.payment_count || 1));
                            const paid = invoicePaidMap.get(contract.id) ?? 0;
                            return (
                              <div className="space-y-1.5">
                                <span className={`text-sm font-bold ${paid >= paymentCount ? 'text-success' : paid > 0 ? 'text-warning' : 'text-destructive'}`}>{paid}/{paymentCount}</span>
                                <Progress value={paymentCount > 0 ? (paid / paymentCount) * 100 : 0} className={`h-1.5 ${paid >= paymentCount ? '[&>div]:bg-success' : paid >= paymentCount / 2 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'}`} />
                              </div>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {/* Desktop Table */}
                <div className="overflow-x-auto hidden md:block">
                  <Table className="min-w-[1000px]">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        {expiredContracts.length > 0 && <TableHead className="text-center w-10"></TableHead>}
                        <TableHead className="text-right">رقم العقد</TableHead><TableHead className="text-right">العقار</TableHead>
                        <TableHead className="text-right">الوحدة</TableHead>
                        <TableHead className="text-right">المستأجر</TableHead><TableHead className="text-right">تاريخ البداية</TableHead>
                        <TableHead className="text-right">تاريخ النهاية</TableHead><TableHead className="text-right">الإيجار السنوي</TableHead>
                        <TableHead className="text-right">نوع الدفع</TableHead><TableHead className="text-right">قيمة الدفعة</TableHead>
                        <TableHead className="text-right">التحصيل</TableHead>
                        <TableHead className="text-right">الحالة</TableHead><TableHead className="text-right">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContracts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((contract) => (
                        <TableRow key={contract.id}>
                          {expiredContracts.length > 0 && (
                            <TableCell className="text-center">
                              {contract.status === 'expired' ? (
                                <Checkbox checked={selectedForRenewal.has(contract.id)} onCheckedChange={() => toggleSelection(contract.id)} />
                              ) : null}
                            </TableCell>
                          )}
                          <TableCell className="font-medium">{contract.contract_number}</TableCell>
                          <TableCell>{contract.property?.property_number || '-'}</TableCell>
                          <TableCell>{contract.unit ? `وحدة ${contract.unit.unit_number}` : 'العقار كامل'}</TableCell>
                          <TableCell>{contract.tenant_name}</TableCell>
                          <TableCell>{contract.start_date}</TableCell>
                          <TableCell>{contract.end_date}</TableCell>
                          <TableCell>{Number(contract.rent_amount).toLocaleString()} ر.س</TableCell>
                          <TableCell>
                            {contract.payment_type === 'monthly' ? 'شهري' : contract.payment_type === 'annual' ? 'سنوي' : `متعدد (${contract.payment_count} دفعات)`}
                          </TableCell>
                          <TableCell>{contract.payment_amount ? `${Number(contract.payment_amount).toLocaleString()} ر.س` : '-'}</TableCell>
                          <TableCell>
                            {(() => {
                              const paymentCount = contract.payment_type === 'monthly' ? 12 : (contract.payment_type === 'annual' ? 1 : (contract.payment_count || 1));
                              const paid = invoicePaidMap.get(contract.id) ?? 0;
                              return (
                                <div className="space-y-1.5">
                                  <span className={`text-sm font-bold min-w-[3rem] text-center block ${paid >= paymentCount ? 'text-success' : paid > 0 ? 'text-warning' : 'text-destructive'}`}>{paid}/{paymentCount}</span>
                                  <Progress value={paymentCount > 0 ? (paid / paymentCount) * 100 : 0} className={`h-1.5 ${paid >= paymentCount ? '[&>div]:bg-success' : paid >= paymentCount / 2 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'}`} />
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell>{getStatusBadge(contract.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-success hover:text-success/80" onClick={() => handleRenew(contract)} aria-label="تجديد العقد"><RefreshCw className="w-4 h-4" /></Button>
                              </TooltipTrigger><TooltipContent>تجديد العقد</TooltipContent></Tooltip></TooltipProvider>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(contract)} aria-label="تعديل"><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: contract.id, name: `العقد ${contract.contract_number}` })} className="text-destructive hover:text-destructive" aria-label="حذف"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
            <TablePagination currentPage={currentPage} totalItems={filteredContracts.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <PaymentInvoicesTab fiscalYearId={fiscalYearId} isClosed={isClosed} />
          </TabsContent>

          <TabsContent value="collection">
            <CollectionReport contracts={contracts} paymentsMap={paymentsMap} isLoading={isLoading} fiscalYears={fiscalYears} fiscalYearId={fiscalYearId} />
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
