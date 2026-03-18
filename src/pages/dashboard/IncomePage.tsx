import { useState, useMemo, useCallback } from 'react';
import { safeNumber } from '@/utils/safeNumber';
import { buildCsv, downloadCsv } from '@/utils/csv';
import IncomeMonthlyChart from '@/components/dashboard/IncomeMonthlyChart';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCreateIncome, useUpdateIncome, useDeleteIncome, useIncomeByFiscalYear } from '@/hooks/useIncome';
import { useProperties } from '@/hooks/useProperties';
import { useContractsByFiscalYear } from '@/hooks/useContracts';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { Income } from '@/types/database';
import { Plus, Trash2, TrendingUp, Edit, Search, Lock, Hash, Calculator, Star, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import TablePagination from '@/components/TablePagination';
import ExportMenu from '@/components/ExportMenu';
import AdvancedFiltersBar from '@/components/filters/AdvancedFiltersBar';
import { EMPTY_FILTERS, type FilterState } from '@/components/filters/advancedFilters.types';
import { generateIncomePDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type SortField = 'amount' | 'date' | 'source' | null;
type SortDir = 'asc' | 'desc';

const IncomePage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear, isClosed } = useFiscalYear();

  const { data: income = [], isLoading } = useIncomeByFiscalYear(fiscalYearId);
  const { data: properties = [] } = useProperties();
  const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId);
  const createIncome = useCreateIncome();
  const updateIncome = useUpdateIncome();
  const deleteIncome = useDeleteIncome();

  const [isOpen, setIsOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [formData, setFormData] = useState({ source: '', amount: '', date: '', property_id: '', notes: '' });

  const resetForm = () => { setFormData({ source: '', amount: '', date: '', property_id: '', notes: '' }); setEditingIncome(null); };

  const handleEdit = (item: Income) => {
    setEditingIncome(item);
    setFormData({ source: item.source, amount: item.amount.toString(), date: item.date, property_id: item.property_id || '', notes: item.notes || '' });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.source || !formData.amount || !formData.date) { toast.error('يرجى ملء جميع الحقول المطلوبة'); return; }
    const amount = parseFloat(formData.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 999_999_999) { toast.error('المبلغ يجب أن يكون رقماً موجباً ولا يتجاوز 999,999,999'); return; }
    const incomeData: Record<string, unknown> = {
      source: formData.source, amount, date: formData.date,
      property_id: formData.property_id || undefined, notes: formData.notes || undefined,
    };
    if (!editingIncome && fiscalYear?.id) {
      incomeData.fiscal_year_id = fiscalYear.id;
    }
    try {
      if (editingIncome) { await updateIncome.mutateAsync({ id: editingIncome.id, ...incomeData } as unknown as Parameters<typeof updateIncome.mutateAsync>[0]); } else { await createIncome.mutateAsync(incomeData as unknown as Parameters<typeof createIncome.mutateAsync>[0]); }
      setIsOpen(false);
      resetForm();
    } catch {
      // onError in the mutation already shows a toast
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteIncome.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // onError in the mutation already shows a toast
    }
  };

  // ترتيب حسب العمود
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

  const totalIncome = income.reduce((sum, item) => sum + Number(item.amount), 0);

  // قائمة المصادر الفريدة للفلتر
  const uniqueSources = useMemo(() => {
    const sources = new Set(income.map((i) => i.source));
    return Array.from(sources).sort();
  }, [income]);

  // I-4: تنبيه الإيراد الناقص — كشف أشهر أقل من 20% من المتوسط
  const lowIncomeMonths = useMemo(() => {
    if (income.length < 3) return []; // لا فائدة من المقارنة مع أقل من 3 سجلات
    const monthMap = new Map<string, number>();
    income.forEach((i) => {
      const month = i.date.slice(0, 7); // YYYY-MM
      monthMap.set(month, (monthMap.get(month) || 0) + Number(i.amount));
    });
    if (monthMap.size < 2) return [];
    const values = Array.from(monthMap.values());
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const threshold = avg * 0.2; // 20% من المتوسط
    return Array.from(monthMap.entries())
      .filter(([, amount]) => amount < threshold)
      .map(([month, amount]) => ({ month, amount, avg: Math.round(avg) }));
  }, [income]);

  const summaryCards = useMemo(() => {
    const count = income.length;
    const avg = count > 0 ? Math.round(totalIncome / count) : 0;
    const sourceMap = new Map<string, number>();
    income.forEach(i => sourceMap.set(i.source, (sourceMap.get(i.source) || 0) + Number(i.amount)));
    let topSource = '-';
    let topSourceAmount = 0;
    sourceMap.forEach((amount, source) => { if (amount > topSourceAmount) { topSourceAmount = amount; topSource = source; } });
    return { count, avg, topSource, topSourceAmount };
  }, [income, totalIncome]);

  // تطبيق الفلاتر + البحث + الترتيب
  const filteredIncome = useMemo(() => {
    let result = income.filter((item) => {
      // بحث نصي
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!item.source.toLowerCase().includes(q) && !(item.notes || '').toLowerCase().includes(q) && !item.date.includes(q)) return false;
      }
      // فلتر المصدر
      if (filters.category && item.source !== filters.category) return false;
      // فلتر العقار
      if (filters.propertyId && item.property_id !== filters.propertyId) return false;
      // نطاق التاريخ
      if (filters.dateFrom && item.date < filters.dateFrom) return false;
      if (filters.dateTo && item.date > filters.dateTo) return false;
      return true;
    });

    // ترتيب
    if (sortField) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortField === 'amount') cmp = Number(a.amount) - Number(b.amount);
        else if (sortField === 'date') cmp = a.date.localeCompare(b.date);
        else if (sortField === 'source') cmp = a.source.localeCompare(b.source, 'ar');
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [income, searchQuery, filters, sortField, sortDir]);

  return (
    <DashboardLayout>
       <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="إدارة الدخل"
          icon={TrendingUp}
          description="تسجيل ومتابعة مصادر الدخل"
          actions={<>
            <ExportMenu onExportPdf={() => generateIncomePDF(income, totalIncome, pdfWaqfInfo)} />
            <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild><Button className="gradient-primary gap-2" disabled={isClosed}><Plus className="w-4 h-4" /><span className="hidden sm:inline">إضافة دخل</span></Button></DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{editingIncome ? 'تعديل الدخل' : 'إضافة دخل جديد'}</DialogTitle><DialogDescription className="sr-only">نموذج إضافة أو تعديل دخل</DialogDescription></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2"><Label>المصدر *</Label><Input value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} placeholder="إيجار، استثمار، تبرع..." /></div>
                  <div className="space-y-2"><Label>المبلغ (ر.س) *</Label><Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="10000" /></div>
                  <div className="space-y-2"><Label>التاريخ *</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label>العقار (اختياري)</Label>
                    <NativeSelect value={formData.property_id} onValueChange={(value) => setFormData({ ...formData, property_id: value })} placeholder="اختر العقار" options={properties.map((p) => ({ value: p.id, label: `${p.property_number} - ${p.location}` }))} />
                  </div>
                  <div className="space-y-2"><Label>ملاحظات</Label><Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="ملاحظات إضافية" /></div>
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1 gradient-primary" disabled={createIncome.isPending || updateIncome.isPending}>{editingIncome ? 'تحديث' : 'إضافة'}</Button>
                    <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>إلغاء</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </>}
        />

        {isClosed && (
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-warning dark:text-warning font-medium flex items-center gap-1 bg-warning/10 px-3 py-1 rounded-md border border-warning/30">
              <Lock className="w-3 h-3" /> سنة مقفلة - تعديل بصلاحية الناظر
            </span>
          </div>
        )}

        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10"><TrendingUp className="w-5 h-5 text-success" /></div>
                <div><p className="text-xs text-muted-foreground">إجمالي الدخل</p><p className="text-xl font-bold text-success">{totalIncome.toLocaleString('ar-SA')} <span className="text-xs font-normal">ريال</span></p></div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Hash className="w-5 h-5 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">عدد السجلات</p><p className="text-xl font-bold">{summaryCards.count}</p></div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/50"><Calculator className="w-5 h-5 text-accent-foreground" /></div>
                <div><p className="text-xs text-muted-foreground">متوسط الدخل</p><p className="text-xl font-bold">{summaryCards.avg.toLocaleString('ar-SA')} <span className="text-xs font-normal">ريال</span></p></div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10"><Star className="w-5 h-5 text-warning" /></div>
                <div><p className="text-xs text-muted-foreground">أعلى مصدر</p><p className="text-sm font-bold truncate max-w-[120px]">{summaryCards.topSource}</p><p className="text-xs text-muted-foreground">{summaryCards.topSourceAmount.toLocaleString('ar-SA')} ريال</p></div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* I-3 + I-8: رسم بياني الدخل الشهري */}
        {!isLoading && income.length > 0 && (
          <IncomeMonthlyChart income={income} contracts={contracts} fiscalYear={fiscalYear} />
        )}

        {/* I-4: تنبيه الإيراد الناقص */}
        {!isLoading && lowIncomeMonths.length > 0 && (
          <Card className="shadow-sm border-warning/50 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-warning">تنبيه: إيرادات منخفضة في {lowIncomeMonths.length} {lowIncomeMonths.length === 1 ? 'شهر' : 'أشهر'}</p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {lowIncomeMonths.map((m) => (
                      <p key={m.month}>
                        شهر <span className="font-medium">{m.month}</span>: {m.amount.toLocaleString('ar-SA')} ر.س
                        <span className="text-destructive"> (أقل من 20% من المتوسط: {m.avg.toLocaleString('ar-SA')} ر.س)</span>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* بحث + فلاتر */}
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث في سجلات الدخل..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-10" />
          </div>
          <AdvancedFiltersBar
            filters={filters}
            onFiltersChange={(f) => { setFilters(f); setCurrentPage(1); }}
            categories={uniqueSources}
            categoryLabel="المصادر"
            categoryPlaceholder="كل المصادر"
            properties={properties}
          />
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12"><p className="text-muted-foreground">جاري التحميل...</p></div>
            ) : filteredIncome.length === 0 ? (
              <div className="py-12 text-center"><TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">{searchQuery || filters.category || filters.propertyId || filters.dateFrom ? 'لا توجد نتائج للبحث' : 'لا توجد سجلات دخل'}</p></div>
            ) : (
              <>
              {/* Mobile Cards */}
              <div className="space-y-3 md:hidden px-3 py-2">
                {filteredIncome.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((item) => (
                  <Card key={item.id} className="shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-sm">{item.source}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.date}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleEdit(item)} disabled={isClosed} aria-label="تعديل"><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: item.id, name: `دخل ${item.source}` })} disabled={isClosed} aria-label="حذف"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div><p className="text-[10px] text-muted-foreground">المبلغ</p><p className="text-sm font-medium text-success">+{Number(item.amount).toLocaleString()} ر.س</p></div>
                        <div><p className="text-[10px] text-muted-foreground">العقار</p><p className="text-sm font-medium">{item.property?.property_number || '-'}</p></div>
                        {item.notes && <div className="col-span-2"><p className="text-[10px] text-muted-foreground">ملاحظات</p><p className="text-sm text-muted-foreground">{item.notes}</p></div>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {/* Desktop Table */}
              <div className="overflow-x-auto hidden md:block"><Table className="min-w-[650px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('source')}>
                      <span className="inline-flex items-center gap-1">المصدر <SortIcon field="source" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('amount')}>
                      <span className="inline-flex items-center gap-1">المبلغ <SortIcon field="amount" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('date')}>
                      <span className="inline-flex items-center gap-1">التاريخ <SortIcon field="date" /></span>
                    </TableHead>
                    <TableHead className="text-right">العقار</TableHead>
                    <TableHead className="text-right">ملاحظات</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncome.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.source}</TableCell>
                      <TableCell className="text-success font-medium">+{Number(item.amount).toLocaleString()} ر.س</TableCell>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>{item.property?.property_number || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{item.notes || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} disabled={isClosed} aria-label="تعديل"><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: item.id, name: `دخل ${item.source}` })} className="text-destructive hover:text-destructive" disabled={isClosed} aria-label="حذف"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div>
              </>
            )}
            <TablePagination currentPage={currentPage} totalItems={filteredIncome.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
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

export default IncomePage;
