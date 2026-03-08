import React, { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useExpensesByFiscalYear, useCreateExpense, useUpdateExpense, useDeleteExpense } from '@/hooks/useExpenses';
import { useInvoicesByFiscalYear } from '@/hooks/useInvoices';
import { useProperties } from '@/hooks/useProperties';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { Expense } from '@/types/database';
import { TableSkeleton } from '@/components/SkeletonLoaders';
import { Trash2, TrendingDown, Edit, Search, Paperclip, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import TablePagination from '@/components/TablePagination';
import ExportMenu from '@/components/ExportMenu';
import ExpenseAttachments from '@/components/expenses/ExpenseAttachments';
import ExpenseSummaryCards from '@/components/expenses/ExpenseSummaryCards';
import ExpenseFormDialog from '@/components/expenses/ExpenseFormDialog';
import { generateExpensesPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ExpensesPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear, isClosed } = useFiscalYear();

  const { data: expenses = [], isLoading } = useExpensesByFiscalYear(fiscalYearId);
  const { data: allInvoices = [] } = useInvoicesByFiscalYear(fiscalYearId);
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
    if (!editingExpense && fiscalYear?.id) {
      expenseData.fiscal_year_id = fiscalYear.id;
    }
    try {
      if (editingExpense) { await updateExpense.mutateAsync({ id: editingExpense.id, ...expenseData } as unknown as Parameters<typeof updateExpense.mutateAsync>[0]); } else { await createExpense.mutateAsync(expenseData as unknown as Parameters<typeof createExpense.mutateAsync>[0]); }
      setIsOpen(false);
      resetForm();
    } catch {
      // onError in the mutation already shows a toast
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteExpense.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // onError in the mutation already shows a toast
    }
  };

  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

  const { expenseInvoiceMap, documentedCount, documentationRate } = useMemo(() => {
    const map = new Map<string, number>();
    allInvoices.forEach((inv) => {
      if (inv.expense_id) {
        map.set(inv.expense_id, (map.get(inv.expense_id) || 0) + 1);
      }
    });
    const documented = expenses.filter((e) => map.has(e.id)).length;
    const rate = expenses.length > 0 ? Math.round((documented / expenses.length) * 100) : 0;
    return { expenseInvoiceMap: map, documentedCount: documented, documentationRate: rate };
  }, [allInvoices, expenses]);

  const filteredExpenses = expenses.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.expense_type.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q) || item.date.includes(q);
  });

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="إدارة المصروفات"
          icon={TrendingDown}
          description="تسجيل ومتابعة المصروفات"
          actions={<>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <ExportMenu onExportPdf={() => generateExpensesPDF(expenses, totalExpenses, pdfWaqfInfo)} />
            <ExpenseFormDialog
              isOpen={isOpen} setIsOpen={setIsOpen} formData={formData} setFormData={setFormData}
              isEditing={!!editingExpense} isPending={createExpense.isPending || updateExpense.isPending}
              properties={properties} onSubmit={handleSubmit} onReset={resetForm} disabled={isClosed}
            />
          </div>
        </div>

        {isClosed && (
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-warning dark:text-warning font-medium flex items-center gap-1 bg-warning/10 px-3 py-1 rounded-md border border-warning/30">
              <Lock className="w-3 h-3" /> سنة مقفلة - تعديل بصلاحية الناظر
            </span>
          </div>
        )}

        <ExpenseSummaryCards expenses={expenses} totalExpenses={totalExpenses} documentedCount={documentedCount} documentationRate={documentationRate} isLoading={isLoading} />

        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث في المصروفات..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-10" />
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : filteredExpenses.length === 0 ? (
              <div className="py-12 text-center"><TrendingDown className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">{searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد مصروفات مسجلة'}</p></div>
            ) : (
              <>
              {/* Mobile Cards */}
              <div className="space-y-3 md:hidden px-3 py-2">
                {filteredExpenses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((item) => {
                  const attachCount = expenseInvoiceMap.get(item.id) || 0;
                  return (
                    <Card key={item.id} className="shadow-sm">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm">{item.expense_type}</span>
                              {attachCount > 0 && (
                                <Badge variant="secondary" className="gap-1 text-xs">
                                  <Paperclip className="w-3 h-3" />{attachCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.date}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleEdit(item)} disabled={isClosed} aria-label="تعديل"><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: item.id, name: `مصروف ${item.expense_type}` })} disabled={isClosed} aria-label="حذف"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          <div><p className="text-[10px] text-muted-foreground">المبلغ</p><p className="text-sm font-medium text-destructive">-{Number(item.amount).toLocaleString()} ر.س</p></div>
                          <div><p className="text-[10px] text-muted-foreground">العقار</p><p className="text-sm font-medium">{item.property?.property_number || '-'}</p></div>
                          {item.description && <div className="col-span-2"><p className="text-[10px] text-muted-foreground">الوصف</p><p className="text-sm text-muted-foreground">{item.description}</p></div>}
                        </div>
                        {expandedRow === item.id && <ExpenseAttachments expenseId={item.id} />}
                        {attachCount > 0 && (
                          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}>
                            {expandedRow === item.id ? 'إخفاء المرفقات' : 'عرض المرفقات'}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {/* Desktop Table */}
               <div className="overflow-x-auto hidden md:block">
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
                            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setExpandedRow(isExpanded ? null : item.id)} aria-label={isExpanded ? 'طي' : 'توسيع'}>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">{item.expense_type}</TableCell>
                          <TableCell className="text-destructive font-medium">-{Number(item.amount).toLocaleString()} ر.س</TableCell>
                          <TableCell>{item.date}</TableCell>
                          <TableCell>{item.property?.property_number || '-'}</TableCell>
                          <TableCell>
                            {attachCount > 0 ? (
                              <Badge variant="secondary" className="gap-1"><Paperclip className="w-3 h-3" />{attachCount}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{item.description || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} disabled={isClosed} aria-label="تعديل"><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: item.id, name: `مصروف ${item.expense_type}` })} className="text-destructive hover:text-destructive" disabled={isClosed} aria-label="حذف"><Trash2 className="w-4 h-4" /></Button>
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
              </>
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
