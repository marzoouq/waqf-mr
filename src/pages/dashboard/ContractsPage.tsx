import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useContracts, useCreateContract, useUpdateContract, useDeleteContract } from '@/hooks/useContracts';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { Contract } from '@/types/database';
import { Plus, Trash2, FileText, Edit, Printer, FileDown, Search, CheckCircle, XCircle, DollarSign, AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';
import TablePagination from '@/components/TablePagination';
import { generateContractsPDF } from '@/utils/pdfGenerator';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ContractsPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { data: contracts = [], isLoading } = useContracts();
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
    const contractData = {
      contract_number: formData.contract_number, property_id: formData.property_id, unit_id: formData.unit_id || null, tenant_name: formData.tenant_name,
      start_date: formData.start_date, end_date: formData.end_date, rent_amount: rentAmount,
      status: formData.status, notes: formData.notes || undefined,
      payment_type: formData.payment_type, payment_count: paymentCount, payment_amount: paymentAmount,
    };
    if (editingContract) {
      await updateContract.mutateAsync({ id: editingContract.id, ...contractData });
    } else {
      await createContract.mutateAsync(contractData);
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
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">إدارة العقود</h1>
            <p className="text-muted-foreground mt-1">عرض وإدارة عقود الإيجار</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2"><Printer className="w-4 h-4" /><span className="hidden sm:inline">طباعة</span></Button>
            <Button variant="outline" size="sm" onClick={() => generateContractsPDF(contracts, pdfWaqfInfo)} className="gap-2"><FileDown className="w-4 h-4" /><span className="hidden sm:inline">تصدير PDF</span></Button>
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"><FileText className="w-5 h-5" /></div>
              <div><p className="text-xs text-muted-foreground">إجمالي العقود</p><p className="text-xl font-bold">{stats.total}</p></div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400"><CheckCircle className="w-5 h-5" /></div>
              <div><p className="text-xs text-muted-foreground">العقود النشطة</p><p className="text-xl font-bold">{stats.active} <span className="text-xs font-normal text-muted-foreground">({stats.activePercent}%)</span></p></div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400"><XCircle className="w-5 h-5" /></div>
              <div><p className="text-xs text-muted-foreground">العقود المنتهية</p><p className="text-xl font-bold">{stats.expired}</p></div>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400"><DollarSign className="w-5 h-5" /></div>
              <div><p className="text-xs text-muted-foreground">الإيرادات التعاقدية</p><p className="text-lg font-bold">{stats.totalRent.toLocaleString()} <span className="text-xs font-normal">ر.س</span></p><p className="text-[10px] text-muted-foreground">نشط: {stats.activeRent.toLocaleString()}</p></div>
            </CardContent>
          </Card>
          <Card className={`${stats.expiringSoon > 0 ? 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800' : 'border-orange-200 bg-orange-50/30 dark:bg-orange-950/10 dark:border-orange-900'}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.expiringSoon > 0 ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400' : 'bg-orange-100/50 dark:bg-orange-900/30 text-orange-400 dark:text-orange-600'}`}><AlertTriangle className="w-5 h-5" /></div>
              <div><p className="text-xs text-muted-foreground">قريبة الانتهاء (90 يوم)</p><p className="text-xl font-bold">{stats.expiringSoon}</p></div>
            </CardContent>
          </Card>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث في العقود..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-10" />
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12"><p className="text-muted-foreground">جاري التحميل...</p></div>
            ) : filteredContracts.length === 0 ? (
              <div className="py-12 text-center"><FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">{searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد عقود مسجلة'}</p></div>
            ) : (
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
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(contract)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: contract.id, name: `العقد ${contract.contract_number}` })} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
