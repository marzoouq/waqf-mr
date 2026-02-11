import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useContracts, useCreateContract, useUpdateContract, useDeleteContract } from '@/hooks/useContracts';
import { useProperties } from '@/hooks/useProperties';
import { Contract } from '@/types/database';
import { Plus, Trash2, FileText, Edit, Printer, FileDown, Search } from 'lucide-react';
import TablePagination from '@/components/TablePagination';
import { generateContractsPDF } from '@/utils/pdfGenerator';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ContractsPage = () => {
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
    contract_number: '', property_id: '', tenant_name: '', start_date: '', end_date: '', rent_amount: '', status: 'active', notes: '',
  });

  const resetForm = () => {
    setFormData({ contract_number: '', property_id: '', tenant_name: '', start_date: '', end_date: '', rent_amount: '', status: 'active', notes: '' });
    setEditingContract(null);
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      contract_number: contract.contract_number, property_id: contract.property_id, tenant_name: contract.tenant_name,
      start_date: contract.start_date, end_date: contract.end_date, rent_amount: contract.rent_amount.toString(),
      status: contract.status, notes: contract.notes || '',
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contract_number || !formData.property_id || !formData.tenant_name || !formData.start_date || !formData.end_date || !formData.rent_amount) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    const contractData = {
      contract_number: formData.contract_number, property_id: formData.property_id, tenant_name: formData.tenant_name,
      start_date: formData.start_date, end_date: formData.end_date, rent_amount: parseFloat(formData.rent_amount),
      status: formData.status, notes: formData.notes || undefined,
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

  const filteredContracts = contracts.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.contract_number.toLowerCase().includes(q) || c.tenant_name.toLowerCase().includes(q) || (c.notes || '').toLowerCase().includes(q);
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">إدارة العقود</h1>
            <p className="text-muted-foreground mt-1">عرض وإدارة عقود الإيجار</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2"><Printer className="w-4 h-4" />طباعة</Button>
            <Button variant="outline" size="sm" onClick={() => generateContractsPDF(contracts)} className="gap-2"><FileDown className="w-4 h-4" />تصدير PDF</Button>
            <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary gap-2"><Plus className="w-4 h-4" />إضافة عقد</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{editingContract ? 'تعديل العقد' : 'إضافة عقد جديد'}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pl-2">
                  <div className="space-y-2"><Label>رقم العقد *</Label><Input value={formData.contract_number} onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })} placeholder="مثال: C-2024-001" /></div>
                  <div className="space-y-2">
                    <Label>العقار *</Label>
                    <Select value={formData.property_id} onValueChange={(value) => setFormData({ ...formData, property_id: value })}>
                      <SelectTrigger><SelectValue placeholder="اختر العقار" /></SelectTrigger>
                      <SelectContent>{properties.map((p) => (<SelectItem key={p.id} value={p.id}>{p.property_number} - {p.location}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>اسم المستأجر *</Label><Input value={formData.tenant_name} onChange={(e) => setFormData({ ...formData, tenant_name: e.target.value })} placeholder="اسم المستأجر" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>تاريخ البداية *</Label><Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} /></div>
                    <div className="space-y-2"><Label>تاريخ النهاية *</Label><Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>قيمة الإيجار (ر.س) *</Label><Input type="number" value={formData.rent_amount} onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })} placeholder="10000" /></div>
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

        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث في العقود..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10" />
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12"><p className="text-muted-foreground">جاري التحميل...</p></div>
            ) : filteredContracts.length === 0 ? (
              <div className="py-12 text-center"><FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">{searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد عقود مسجلة'}</p></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">رقم العقد</TableHead><TableHead className="text-right">العقار</TableHead>
                    <TableHead className="text-right">المستأجر</TableHead><TableHead className="text-right">تاريخ البداية</TableHead>
                    <TableHead className="text-right">تاريخ النهاية</TableHead><TableHead className="text-right">قيمة الإيجار</TableHead>
                    <TableHead className="text-right">الحالة</TableHead><TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">{contract.contract_number}</TableCell>
                      <TableCell>{contract.property?.property_number || '-'}</TableCell>
                      <TableCell>{contract.tenant_name}</TableCell>
                      <TableCell>{contract.start_date}</TableCell>
                      <TableCell>{contract.end_date}</TableCell>
                      <TableCell>{Number(contract.rent_amount).toLocaleString()} ر.س</TableCell>
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
