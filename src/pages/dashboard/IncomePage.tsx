import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCreateIncome, useUpdateIncome, useDeleteIncome, useIncomeByFiscalYear } from '@/hooks/useIncome';
import { useProperties } from '@/hooks/useProperties';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { Income } from '@/types/database';
import { Plus, Trash2, TrendingUp, Edit, Search, Lock, Hash, Calculator, Star } from 'lucide-react';
import TablePagination from '@/components/TablePagination';
import ExportMenu from '@/components/ExportMenu';
import { generateIncomePDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const IncomePage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear, isClosed } = useFiscalYear();

  const { data: income = [], isLoading } = useIncomeByFiscalYear(fiscalYearId);
  const { data: properties = [] } = useProperties();
  const createIncome = useCreateIncome();
  const updateIncome = useUpdateIncome();
  const deleteIncome = useDeleteIncome();

  const [isOpen, setIsOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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
    const incomeData: Record<string, unknown> = {
      source: formData.source, amount: parseFloat(formData.amount), date: formData.date,
      property_id: formData.property_id || undefined, notes: formData.notes || undefined,
    };
    if (!editingIncome && fiscalYear?.id) {
      incomeData.fiscal_year_id = fiscalYear.id;
    }
    if (editingIncome) { await updateIncome.mutateAsync({ id: editingIncome.id, ...incomeData } as unknown as Parameters<typeof updateIncome.mutateAsync>[0]); } else { await createIncome.mutateAsync(incomeData as unknown as Parameters<typeof createIncome.mutateAsync>[0]); }
    setIsOpen(false);
    resetForm();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteIncome.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const totalIncome = income.reduce((sum, item) => sum + Number(item.amount), 0);

  // بطاقات الملخص مع useMemo بدل IIFE
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

  const filteredIncome = income.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.source.toLowerCase().includes(q) || (item.notes || '').toLowerCase().includes(q) || item.date.includes(q);
  });

  return (
    <DashboardLayout>
       <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display truncate">إدارة الدخل</h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">تسجيل ومتابعة مصادر الدخل</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                    <Select value={formData.property_id} onValueChange={(value) => setFormData({ ...formData, property_id: value })}>
                      <SelectTrigger><SelectValue placeholder="اختر العقار" /></SelectTrigger>
                      <SelectContent>{properties.map((p) => (<SelectItem key={p.id} value={p.id}>{p.property_number} - {p.location}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>ملاحظات</Label><Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="ملاحظات إضافية" /></div>
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1 gradient-primary" disabled={createIncome.isPending || updateIncome.isPending}>{editingIncome ? 'تحديث' : 'إضافة'}</Button>
                    <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>إلغاء</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

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

        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث في سجلات الدخل..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-10" />
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12"><p className="text-muted-foreground">جاري التحميل...</p></div>
            ) : filteredIncome.length === 0 ? (
              <div className="py-12 text-center"><TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">{searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد سجلات دخل'}</p></div>
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
                    <TableHead className="text-right">المصدر</TableHead><TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead><TableHead className="text-right">العقار</TableHead>
                    <TableHead className="text-right">ملاحظات</TableHead><TableHead className="text-right">إجراءات</TableHead>
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
