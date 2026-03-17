import React, { useState, useMemo, useCallback } from 'react';
import { safeNumber } from '@/utils/safeNumber';
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
import { Trash2, TrendingDown, Edit, Search, Paperclip, ChevronDown, ChevronUp, Lock, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import TablePagination from '@/components/TablePagination';
import ExportMenu from '@/components/ExportMenu';
import { buildCsv, downloadCsv } from '@/utils/csv';
import ExpenseAttachments from '@/components/expenses/ExpenseAttachments';
import ExpenseSummaryCards from '@/components/expenses/ExpenseSummaryCards';
import ExpenseFormDialog from '@/components/expenses/ExpenseFormDialog';
import AdvancedFiltersBar, { FilterState, EMPTY_FILTERS } from '@/components/filters/AdvancedFiltersBar';
import ExpensesPieChart from '@/components/expenses/ExpensesPieChart';
import ExpenseBudgetBar from '@/components/expenses/ExpenseBudgetBar';
import { generateExpensesPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type SortField = 'amount' | 'date' | 'expense_type' | null;
type SortDir = 'asc' | 'desc';

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
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
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
    const amount = parseFloat(formData.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 999_999_999) { toast.error('المبلغ يجب أن يكون رقماً موجباً ولا يتجاوز 999,999,999'); return; }
    const expenseData: Record<string, unknown> = {
      expense_type: formData.expense_type, amount, date: formData.date,
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

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setCurrentPage(1);
  }, [sortField]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const totalExpenses = expenses.reduce((sum, item) => sum + safeNumber(item.amount), 0);

  // قائمة أنواع المصروفات الفريدة
  const uniqueTypes = useMemo(() => {
    const types = new Set(expenses.map((e) => e.expense_type));
    return Array.from(types).sort();
  }, [expenses]);

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

  // تطبيق الفلاتر + البحث + الترتيب
  const filteredExpenses = useMemo(() => {
    let result = expenses.filter((item) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!item.expense_type.toLowerCase().includes(q) && !(item.description || '').toLowerCase().includes(q) && !item.date.includes(q)) return false;
      }
      if (filters.category && item.expense_type !== filters.category) return false;
      if (filters.propertyId && item.property_id !== filters.propertyId) return false;
      if (filters.dateFrom && item.date < filters.dateFrom) return false;
      if (filters.dateTo && item.date > filters.dateTo) return false;
      return true;
    });

    if (sortField) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortField === 'amount') cmp = safeNumber(a.amount) - safeNumber(b.amount);
        else if (sortField === 'date') cmp = a.date.localeCompare(b.date);
        else if (sortField === 'expense_type') cmp = a.expense_type.localeCompare(b.expense_type, 'ar');
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [expenses, searchQuery, filters, sortField, sortDir]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="إدارة المصروفات"
          icon={TrendingDown}
          description="تسجيل ومتابعة المصروفات"
          actions={<>
            <ExportMenu onExportPdf={() => generateExpensesPDF(expenses, totalExpenses, pdfWaqfInfo)} />
            <ExpenseFormDialog
              isOpen={isOpen} setIsOpen={setIsOpen} formData={formData} setFormData={setFormData}
              isEditing={!!editingExpense} isPending={createExpense.isPending || updateExpense.isPending}
              properties={properties} onSubmit={handleSubmit} onReset={resetForm} disabled={isClosed}
            />
          </>}
        />

        {isClosed && (
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-warning dark:text-warning font-medium flex items-center gap-1 bg-warning/10 px-3 py-1 rounded-md border border-warning/30">
              <Lock className="w-3 h-3" /> سنة مقفلة - تعديل بصلاحية الناظر
            </span>
          </div>
        )}

        <ExpenseSummaryCards expenses={expenses} totalExpenses={totalExpenses} documentedCount={documentedCount} documentationRate={documentationRate} isLoading={isLoading} />

        {/* E-8: رسم بياني دائري للمصروفات */}
        <ExpensesPieChart expenses={expenses} isLoading={isLoading} />

        {/* E-2: ميزانية تقديرية للمصروفات */}
        <ExpenseBudgetBar expenses={expenses} fiscalYearId={fiscalYearId} isClosed={isClosed} />

        {/* بحث + فلاتر */}
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث في المصروفات..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-10" />
          </div>
          <AdvancedFiltersBar
            filters={filters}
            onFiltersChange={(f) => { setFilters(f); setCurrentPage(1); }}
            categories={uniqueTypes}
            categoryLabel="الأنواع"
            categoryPlaceholder="كل الأنواع"
            properties={properties}
          />
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : filteredExpenses.length === 0 ? (
              <div className="py-12 text-center"><TrendingDown className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">{searchQuery || filters.category || filters.propertyId || filters.dateFrom ? 'لا توجد نتائج للبحث' : 'لا توجد مصروفات مسجلة'}</p></div>
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
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('expense_type')}>
                      <span className="inline-flex items-center gap-1">النوع <SortIcon field="expense_type" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('amount')}>
                      <span className="inline-flex items-center gap-1">المبلغ <SortIcon field="amount" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('date')}>
                      <span className="inline-flex items-center gap-1">التاريخ <SortIcon field="date" /></span>
                    </TableHead>
                    <TableHead className="text-right">العقار</TableHead>
                    <TableHead className="text-right">المرفقات</TableHead>
                    <TableHead className="text-right">الوصف</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
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
