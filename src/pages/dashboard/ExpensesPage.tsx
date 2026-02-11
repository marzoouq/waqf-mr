import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from '@/hooks/useExpenses';
import { useProperties } from '@/hooks/useProperties';
import { Expense } from '@/types/database';
import { Plus, Trash2, TrendingDown, Edit, Printer, FileDown, Search } from 'lucide-react';
import TablePagination from '@/components/TablePagination';
import { generateExpensesPDF } from '@/utils/pdfGenerator';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const EXPENSE_TYPES = ['كهرباء', 'مياه', 'صيانة', 'عمالة', 'منصة إيجار', 'كتابة عقود', 'تأمين', 'ضرائب', 'أخرى'];

const ExpensesPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { data: expenses = [], isLoading } = useExpenses();
  const { data: properties = [] } = useProperties();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [isOpen, setIsOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [formData, setFormData] = useState({ expense_type: '', amount: '', date: '', property_id: '', description: '' });

  const resetForm = () => { setFormData({ expense_type: '', amount: '', date: '', property_id: '', description: '' }); setEditingExpense(null); };

  const handleEdit = (item: Expense) => {
    setEditingExpense(item);
    setFormData({ expense_type: item.expense_type, amount: item.amount.toString(), date: item.date, property_id: item.property_id || '', description: item.description || '' });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.expense_type || !formData.amount || !formData.date) { toast.error('يرجى ملء جميع الحقول المطلوبة'); return; }
    const expenseData = { expense_type: formData.expense_type, amount: parseFloat(formData.amount), date: formData.date, property_id: formData.property_id || undefined, description: formData.description || undefined };
    if (editingExpense) { await updateExpense.mutateAsync({ id: editingExpense.id, ...expenseData }); } else { await createExpense.mutateAsync(expenseData); }
    setIsOpen(false);
    resetForm();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteExpense.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

  const filteredExpenses = expenses.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.expense_type.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q) || item.date.includes(q);
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">إدارة المصروفات</h1>
            <p className="text-muted-foreground mt-1">تسجيل ومتابعة المصروفات</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2"><Printer className="w-4 h-4" />طباعة</Button>
            <Button variant="outline" size="sm" onClick={() => generateExpensesPDF(expenses, totalExpenses, pdfWaqfInfo)} className="gap-2"><FileDown className="w-4 h-4" />تصدير PDF</Button>
            <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild><Button className="gradient-primary gap-2"><Plus className="w-4 h-4" />إضافة مصروف</Button></DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{editingExpense ? 'تعديل المصروف' : 'إضافة مصروف جديد'}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>نوع المصروف *</Label>
                    <Select value={formData.expense_type} onValueChange={(value) => setFormData({ ...formData, expense_type: value })}>
                      <SelectTrigger><SelectValue placeholder="اختر نوع المصروف" /></SelectTrigger>
                      <SelectContent>{EXPENSE_TYPES.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>المبلغ (ر.س) *</Label><Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="1000" /></div>
                  <div className="space-y-2"><Label>التاريخ *</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label>العقار (اختياري)</Label>
                    <Select value={formData.property_id} onValueChange={(value) => setFormData({ ...formData, property_id: value })}>
                      <SelectTrigger><SelectValue placeholder="اختر العقار" /></SelectTrigger>
                      <SelectContent>{properties.map((p) => (<SelectItem key={p.id} value={p.id}>{p.property_number} - {p.location}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>الوصف</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="وصف إضافي" /></div>
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1 gradient-primary" disabled={createExpense.isPending || updateExpense.isPending}>{editingExpense ? 'تحديث' : 'إضافة'}</Button>
                    <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>إلغاء</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="shadow-sm bg-destructive/10 border-destructive/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-destructive/20 rounded-xl flex items-center justify-center"><TrendingDown className="w-6 h-6 text-destructive" /></div>
              <div><p className="text-sm text-muted-foreground">إجمالي المصروفات</p><p className="text-3xl font-bold text-destructive">{totalExpenses.toLocaleString()} ر.س</p></div>
            </div>
          </CardContent>
        </Card>

        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث في المصروفات..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-10" />
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12"><p className="text-muted-foreground">جاري التحميل...</p></div>
            ) : filteredExpenses.length === 0 ? (
              <div className="py-12 text-center"><TrendingDown className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">{searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد مصروفات مسجلة'}</p></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">النوع</TableHead><TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead><TableHead className="text-right">العقار</TableHead>
                    <TableHead className="text-right">الوصف</TableHead><TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.expense_type}</TableCell>
                      <TableCell className="text-destructive font-medium">-{Number(item.amount).toLocaleString()} ر.س</TableCell>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>{item.property?.property_number || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{item.description || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: item.id, name: `مصروف ${item.expense_type}` })} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <TablePagination currentPage={currentPage} totalItems={filteredExpenses.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
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

export default ExpensesPage;
