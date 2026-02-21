import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useContracts, useCreateContract, useUpdateContract, useDeleteContract, useContractsByFiscalYear } from '@/hooks/useContracts';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { Contract } from '@/types/database';
import { Plus, Trash2, FileText, Edit, Search, CheckCircle, XCircle, DollarSign, AlertTriangle, Lock, Info, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMemo } from 'react';
import TablePagination from '@/components/TablePagination';
import ExportMenu from '@/components/ExportMenu';
import { generateContractsPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ContractsPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear, fiscalYears, isClosed, setFiscalYearId } = useFiscalYear();

  const { data: contracts = [], isLoading } = useContractsByFiscalYear(fiscalYearId);
  const { data: properties = [] } = useProperties();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();

  const [isOpen, setIsOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [formData, setFormData] = useState({
    contract_number: '', property_id: '', unit_id: '', tenant_name: '', start_date: '', end_date: '', rent_amount: '', status: 'active', notes: '',
    payment_type: 'annual', payment_count: '1',
  });

  const { data: propertyUnits = [] } = useUnits(formData.property_id || undefined);

  const resetForm = () => {
    setFormData({ contract_number: '', property_id: '', unit_id: '', tenant_name: '', start_date: '', end_date: '', rent_amount: '', status: 'active', notes: '', payment_type: 'annual', payment_count: '1' });
    setEditingContract(null);
  };

  const handleRenew = (contract: Contract) => {
    const num = contract.contract_number;
    const match = num.match(/-R(\d+)$/);
    const newNumber = match ? num.replace(/-R(\d+)$/, `-R${parseInt(match[1]) + 1}`) : `${num}-R1`;
    setFormData({
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
    });
    setEditingContract(null);
    setIsOpen(true);
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      contract_number: contract.contract_number, property_id: contract.property_id, unit_id: contract.unit_id || '', tenant_name: contract.tenant_name,
      start_date: contract.start_date, end_date: contract.end_date, rent_amount: contract.rent_amount.toString(),
      status: contract.status, notes: contract.notes || '',
      payment_type: contract.payment_type || 'annual', payment_count: (contract.payment_count || 1).toString(),
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contract_number || !formData.property_id || !formData.tenant_name || !formData.start_date || !formData.end_date || !formData.rent_amount) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    const paymentCount = formData.payment_type === 'monthly' ? 12 : (formData.payment_type === 'annual' ? 1 : parseInt(formData.payment_count) || 1);
    const rentAmount = parseFloat(formData.rent_amount);
    const paymentAmount = rentAmount / paymentCount;
    const contractData: Record<string, unknown> = {
      contract_number: formData.contract_number, property_id: formData.property_id, unit_id: formData.unit_id || null, tenant_name: formData.tenant_name,
      start_date: formData.start_date, end_date: formData.end_date, rent_amount: rentAmount,
      status: formData.status, notes: formData.notes || undefined,
      payment_type: formData.payment_type, payment_count: paymentCount, payment_amount: paymentAmount,
    };
    if (editingContract) {
      // fiscal_year_id لا يتغير عند التعديل (العقد يبقى في سنته الأصلية)
      await updateContract.mutateAsync({ id: editingContract.id, ...contractData } as unknown as Parameters<typeof updateContract.mutateAsync>[0]);
    } else {
      // العقد الجديد يُربط بالسنة المالية النشطة تلقائياً
      const { data: activeFY } = await (await import('@/integrations/supabase/client')).supabase
        .from('fiscal_years').select('id').eq('status', 'active').limit(1).maybeSingle();
      if (activeFY?.id) contractData.fiscal_year_id = activeFY.id;
      await createContract.mutateAsync(contractData as unknown as Parameters<typeof createContract.mutateAsync>[0]);
    }
    setIsOpen(false);
    resetForm();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteContract.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="px-2 py-1 rounded-full text-xs bg-success/20 text-success">نشط</span>;
      case 'expired': return <span className="px-2 py-1 rounded-full text-xs bg-destructive/20 text-destructive">منتهي</span>;
      case 'pending': return <span className="px-2 py-1 rounded-full text-xs bg-warning/20 text-warning">معلق</span>;
      default: return <span className="px-2 py-1 rounded-full text-xs bg-muted">{status}</span>;
    }
  };

  const getPaymentTypeLabel = (type?: string) => type === 'monthly' ? 'شهري' : type === 'annual' ? 'سنوي' : 'متعدد';

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display truncate">إدارة العقود</h1>
            <p className="text-muted-foreground mt-1 text-sm">عرض وإدارة عقود الإيجار</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <ExportMenu onExportPdf={() => generateContractsPDF(contracts, pdfWaqfInfo)} />
            <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary gap-2"><Plus className="w-4 h-4" />إضافة عقد</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{editingContract ? 'تعديل العقد' : 'إضافة عقد جديد'}</DialogTitle><DialogDescription className="sr-only">نموذج إضافة أو تعديل عقد إيجار</DialogDescription></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pl-2">
                  <div className="space-y-2"><Label>رقم العقد *</Label><Input value={formData.contract_number} onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })} placeholder="مثال: C-2024-001" /></div>
                  <div className="space-y-2">
                    <Label>العقار *</Label>
                    <Select value={formData.property_id} onValueChange={(value) => setFormData({ ...formData, property_id: value })}>
                      <SelectTrigger><SelectValue placeholder="اختر العقار" /></SelectTrigger>
                      <SelectContent>{properties.map((p) => (<SelectItem key={p.id} value={p.id}>{p.property_number} - {p.location}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  {formData.property_id && (
                    <div className="space-y-2">
                      <Label>الوحدة</Label>
                      <Select value={formData.unit_id} onValueChange={(value) => setFormData({ ...formData, unit_id: value === 'full' ? '' : value })}>
                        <SelectTrigger><SelectValue placeholder="العقار كامل" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">العقار كامل</SelectItem>
                          {propertyUnits.map((u) => (<SelectItem key={u.id} value={u.id}>وحدة {u.unit_number}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2"><Label>اسم المستأجر *</Label><Input value={formData.tenant_name} onChange={(e) => setFormData({ ...formData, tenant_name: e.target.value })} placeholder="اسم المستأجر" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>تاريخ البداية *</Label><Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} /></div>
                    <div className="space-y-2"><Label>تاريخ النهاية *</Label><Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>قيمة الإيجار السنوي (ر.س) *</Label><Input type="number" value={formData.rent_amount} onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })} placeholder="10000" /></div>
                  <div className="space-y-2">
                    <Label>نوع الدفع *</Label>
                    <Select value={formData.payment_type} onValueChange={(value) => setFormData({ ...formData, payment_type: value, payment_count: value === 'monthly' ? '12' : value === 'annual' ? '1' : formData.payment_count })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">سنوي (دفعة واحدة)</SelectItem>
                        <SelectItem value="monthly">شهري (12 دفعة)</SelectItem>
                        <SelectItem value="multi">دفعات متعددة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.payment_type === 'multi' && (
                    <div className="space-y-2">
                      <Label>عدد الدفعات *</Label>
                      <Input type="number" min="2" max="12" value={formData.payment_count} onChange={(e) => setFormData({ ...formData, payment_count: e.target.value })} placeholder="2-12" />
                    </div>
                  )}
                  {formData.rent_amount && (
                    <div className="p-3 rounded-lg bg-muted/50 text-sm">
                      <span className="text-muted-foreground">قيمة الدفعة الواحدة: </span>
                      <span className="font-bold text-primary">
                        {(parseFloat(formData.rent_amount) / (formData.payment_type === 'monthly' ? 12 : formData.payment_type === 'annual' ? 1 : (parseInt(formData.payment_count) || 1))).toLocaleString('ar-SA', { maximumFractionDigits: 2 })} ر.س
                      </span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>الحالة</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="active">نشط</SelectItem><SelectItem value="expired">منتهي</SelectItem><SelectItem value="pending">معلق</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>ملاحظات</Label><Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="ملاحظات إضافية" /></div>
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1 gradient-primary" disabled={createContract.isPending || updateContract.isPending}>{editingContract ? 'تحديث' : 'إضافة'}</Button>
                    <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>إلغاء</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* مربعات إحصائية */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="border-info/30 bg-info/5">
             <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
               <div className="p-1.5 sm:p-2 rounded-lg bg-info/15 text-info"><FileText className="w-4 h-4 sm:w-5 sm:h-5" /></div>
               <div><p className="text-[10px] sm:text-xs text-muted-foreground">إجمالي العقود</p><p className="text-lg sm:text-xl font-bold">{stats.total}</p></div>
            </CardContent>
          </Card>
          <Card className="border-success/30 bg-success/5">
             <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
               <div className="p-1.5 sm:p-2 rounded-lg bg-success/15 text-success"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /></div>
               <div><p className="text-[10px] sm:text-xs text-muted-foreground">العقود النشطة</p><p className="text-lg sm:text-xl font-bold">{stats.active} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">({stats.activePercent}%)</span></p></div>
            </CardContent>
          </Card>
          <Card className="border-destructive/30 bg-destructive/5">
             <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
               <div className="p-1.5 sm:p-2 rounded-lg bg-destructive/15 text-destructive"><XCircle className="w-4 h-4 sm:w-5 sm:h-5" /></div>
               <div><p className="text-[10px] sm:text-xs text-muted-foreground">العقود المنتهية</p><p className="text-lg sm:text-xl font-bold">{stats.expired}</p></div>
            </CardContent>
          </Card>
          <Card className="border-accent/30 bg-accent/5">
             <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
               <div className="p-1.5 sm:p-2 rounded-lg bg-accent/15 text-accent-foreground"><DollarSign className="w-4 h-4 sm:w-5 sm:h-5" /></div>
               <div><p className="text-[10px] sm:text-xs text-muted-foreground">الإيرادات التعاقدية</p><p className="text-base sm:text-lg font-bold truncate">{stats.totalRent.toLocaleString()} <span className="text-[10px] sm:text-xs font-normal">ر.س</span></p><p className="text-[10px] text-muted-foreground">نشط: {stats.activeRent.toLocaleString()}</p></div>
            </CardContent>
          </Card>
          <Card className={`${stats.expiringSoon > 0 ? 'border-warning/40 bg-warning/10' : 'border-warning/20 bg-warning/5'}`}>
             <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
               <div className={`p-1.5 sm:p-2 rounded-lg ${stats.expiringSoon > 0 ? 'bg-warning/20 text-warning' : 'bg-warning/10 text-warning/60'}`}><AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" /></div>
               <div><p className="text-[10px] sm:text-xs text-muted-foreground">قريبة الانتهاء (90 يوم)</p><p className="text-lg sm:text-xl font-bold">{stats.expiringSoon}</p></div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث في العقود..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-10" />
          </div>
        </div>

        {isClosed && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-warning/30 bg-warning/10 text-warning text-sm">
            <Lock className="w-4 h-4 shrink-0" />
            <span>سنة مقفلة - تعديل بصلاحية الناظر</span>
          </div>
        )}

        <Card className="shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12"><p className="text-muted-foreground">جاري التحميل...</p></div>
            ) : filteredContracts.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد عقود مسجلة'}</p>
                {!searchQuery && contracts.length === 0 && fiscalYearId !== 'all' && fiscalYears.length > 1 && (
                  <div className="mt-4 mx-auto max-w-md flex items-center gap-2 p-3 rounded-lg border border-info/30 bg-info/10 text-info text-sm">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>
                      لا توجد عقود في هذه السنة المالية. جرّب التبديل إلى{' '}
                      <button
                        type="button"
                        className="underline font-semibold hover:opacity-80"
                        onClick={() => setFiscalYearId('all')}
                      >
                        جميع السنوات
                      </button>
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
                       <div className="flex items-start justify-between gap-2">
                         <div className="min-w-0 flex-1">
                           <div className="flex items-center gap-2 flex-wrap">
                             <span className="font-bold text-sm">{contract.contract_number}</span>
                             {getStatusBadge(contract.status)}
                           </div>
                           <p className="text-xs text-muted-foreground mt-0.5">{contract.tenant_name}</p>
                         </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="w-8 h-8 text-success hover:text-success/80" onClick={() => handleRenew(contract)} title="تجديد العقد"><RefreshCw className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleEdit(contract)}><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: contract.id, name: `العقد ${contract.contract_number}` })}><Trash2 className="w-4 h-4" /></Button>
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
                     </CardContent>
                   </Card>
                 ))}
               </div>
               {/* Desktop Table */}
               <div className="overflow-x-auto hidden md:block">
               <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">رقم العقد</TableHead><TableHead className="text-right">العقار</TableHead>
                    <TableHead className="text-right">الوحدة</TableHead>
                    <TableHead className="text-right">المستأجر</TableHead><TableHead className="text-right">تاريخ البداية</TableHead>
                    <TableHead className="text-right">تاريخ النهاية</TableHead><TableHead className="text-right">الإيجار السنوي</TableHead>
                    <TableHead className="text-right">نوع الدفع</TableHead><TableHead className="text-right">قيمة الدفعة</TableHead>
                    <TableHead className="text-right">الحالة</TableHead><TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((contract) => (
                    <TableRow key={contract.id}>
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
                      <TableCell>{getStatusBadge(contract.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <TooltipProvider><Tooltip><TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-success hover:text-success/80" onClick={() => handleRenew(contract)}><RefreshCw className="w-4 h-4" /></Button>
                          </TooltipTrigger><TooltipContent>تجديد العقد</TooltipContent></Tooltip></TooltipProvider>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(contract)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: contract.id, name: `العقد ${contract.contract_number}` })} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
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
