import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useExpensesByFiscalYear } from '@/hooks/useExpenses';
import { useInvoices } from '@/hooks/useInvoices';
import { useProperties } from '@/hooks/useProperties';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { Expense } from '@/types/database';
import { Plus, Trash2, TrendingDown, Edit, Search, Paperclip, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import TablePagination from '@/components/TablePagination';
import ExportMenu from '@/components/ExportMenu';
import ExpenseAttachments from '@/components/expenses/ExpenseAttachments';
import { generateExpensesPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const EXPENSE_TYPES = ['كهرباء', 'مياه', 'صيانة', 'عمالة', 'منصة إيجار', 'كتابة عقود', 'تأمين', 'ضرائب', 'أخرى'];

const ExpensesPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear, isClosed } = useFiscalYear();
  const activeFYId = fiscalYear?.status === 'active' ? fiscalYear.id : undefined;

  const { data: expenses = [], isLoading } = useExpensesByFiscalYear(fiscalYearId);
  const { data: allInvoices = [] } = useInvoices();
  const { data: properties = [] } = useProperties();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [isOpen, setIsOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
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
    const expenseData: Record<string, unknown> = {
      expense_type: formData.expense_type, amount: parseFloat(formData.amount), date: formData.date,
      property_id: formData.property_id || undefined, description: formData.description || undefined,
    };
    if (!editingExpense && activeFYId) {
      expenseData.fiscal_year_id = activeFYId;
    }
    if (editingExpense) { await updateExpense.mutateAsync({ id: editingExpense.id, ...expenseData } as any); } else { await createExpense.mutateAsync(expenseData as any); }
    setIsOpen(false);
    resetForm();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteExpense.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

  // Count documented vs undocumented expenses
  const expenseInvoiceMap = new Map<string, number>();
  allInvoices.forEach((inv) => {
    if (inv.expense_id) {
      expenseInvoiceMap.set(inv.expense_id, (expenseInvoiceMap.get(inv.expense_id) || 0) + 1);
    }
  });
  const documentedCount = expenses.filter((e) => expenseInvoiceMap.has(e.id)).length;
  const documentationRate = expenses.length > 0 ? Math.round((documentedCount / expenses.length) * 100) : 0;

  const filteredExpenses = expenses.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.expense_type.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q) || item.date.includes(q);
  });

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display truncate">إدارة المصروفات</h1>
            <p className="text-muted-foreground mt-1 text-sm">تسجيل ومتابعة المصروفات</p>
          </div>
           <div className="flex flex-wrap items-center gap-2 shrink-0">
            <ExportMenu onExportPdf={() => generateExpensesPDF(expenses, totalExpenses, pdfWaqfInfo)} />
            <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild><Button className="gradient-primary gap-2"><Plus className="w-4 h-4" />إضافة مصروف</Button></DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{editingExpense ? 'تعديل المصروف' : 'إضافة مصروف جديد'}</DialogTitle><DialogDescription className="sr-only">نموذج إضافة أو تعديل مصروف</DialogDescription></DialogHeader>
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

        {isClosed && (
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 rounded-md border border-amber-200 dark:border-amber-800">
              <Lock className="w-3 h-3" /> سنة مقفلة - تعديل بصلاحية الناظر
            </span>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card className="shadow-sm bg-destructive/10 border-destructive/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-destructive/20 rounded-xl flex items-center justify-center"><TrendingDown className="w-5 h-5 text-destructive" /></div>
                <div><p className="text-xs text-muted-foreground">إجمالي المصروفات</p><p className="text-2xl font-bold text-destructive">{totalExpenses.toLocaleString()} ر.س</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center"><Paperclip className="w-5 h-5 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">نسبة التوثيق</p><p className="text-2xl font-bold">{documentationRate}%</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                  <Badge variant="outline" className="text-xs">{documentedCount}/{expenses.length}</Badge>
                </div>
                <div><p className="text-xs text-muted-foreground">موثق / إجمالي</p><p className="text-sm text-muted-foreground">{expenses.length - documentedCount} مصروف بدون فاتورة</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

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
               <div className="overflow-x-auto">
               <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right w-8"></TableHead>
                    <TableHead className="text-right">النوع</TableHead><TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead><TableHead className="text-right">العقار</TableHead>
                    <TableHead className="text-right">المرفقات</TableHead>
                    <TableHead className="text-right">الوصف</TableHead><TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((item) => {
                    const attachCount = expenseInvoiceMap.get(item.id) || 0;
                    const isExpanded = expandedRow === item.id;
                    return (
                      <React.Fragment key={item.id}>
                        <TableRow className={isExpanded ? 'border-b-0' : ''}>
                          <TableCell className="p-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-6 h-6"
                              onClick={() => setExpandedRow(isExpanded ? null : item.id)}
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">{item.expense_type}</TableCell>
                          <TableCell className="text-destructive font-medium">-{Number(item.amount).toLocaleString()} ر.س</TableCell>
                          <TableCell>{item.date}</TableCell>
                          <TableCell>{item.property?.property_number || '-'}</TableCell>
                          <TableCell>
                            {attachCount > 0 ? (
                              <Badge variant="secondary" className="gap-1">
                                <Paperclip className="w-3 h-3" />{attachCount}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{item.description || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: item.id, name: `مصروف ${item.expense_type}` })} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${item.id}-expand`}>
                            <TableCell colSpan={8} className="p-0 bg-muted/10">
                              <ExpenseAttachments expenseId={item.id} />
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
               </Table>
               </div>
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
