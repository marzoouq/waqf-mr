import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useIncome, useCreateIncome, useUpdateIncome, useDeleteIncome, useIncomeByFiscalYear } from '@/hooks/useIncome';
import { useProperties } from '@/hooks/useProperties';
import { useActiveFiscalYear } from '@/hooks/useFiscalYears';
import { Income } from '@/types/database';
import { Plus, Trash2, TrendingUp, Edit, Search, Lock } from 'lucide-react';
import TablePagination from '@/components/TablePagination';
import ExportMenu from '@/components/ExportMenu';
import FiscalYearSelector from '@/components/FiscalYearSelector';
import { generateIncomePDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const IncomePage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { data: activeFY, fiscalYears } = useActiveFiscalYear();
  const [selectedFY, setSelectedFY] = useState<string>('');
  const fiscalYearId = selectedFY || activeFY?.id || 'all';
  const currentFY = fiscalYears.find(fy => fy.id === fiscalYearId);
  const isClosed = currentFY?.status === 'closed';

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
    // Auto-assign active fiscal year for new records
    if (!editingIncome && activeFY) {
      incomeData.fiscal_year_id = activeFY.id;
    }
    if (editingIncome) { await updateIncome.mutateAsync({ id: editingIncome.id, ...incomeData } as any); } else { await createIncome.mutateAsync(incomeData as any); }
    setIsOpen(false);
    resetForm();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteIncome.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const totalIncome = income.reduce((sum, item) => sum + Number(item.amount), 0);

  const filteredIncome = income.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.source.toLowerCase().includes(q) || (item.notes || '').toLowerCase().includes(q) || item.date.includes(q);
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">إدارة الدخل</h1>
            <p className="text-muted-foreground mt-1">تسجيل ومتابعة مصادر الدخل</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportMenu onExportPdf={() => generateIncomePDF(income, totalIncome, pdfWaqfInfo)} />
            <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild><Button className="gradient-primary gap-2" disabled={isClosed}><Plus className="w-4 h-4" />إضافة دخل</Button></DialogTrigger>
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

        <div className="flex flex-wrap items-center gap-4">
          <FiscalYearSelector value={fiscalYearId} onChange={setSelectedFY} />
          {isClosed && (
            <span className="text-sm text-destructive font-medium flex items-center gap-1">
              <Lock className="w-3 h-3" /> سنة مقفلة - لا يمكن التعديل
            </span>
          )}
        </div>

        <Card className="shadow-sm gradient-primary text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center"><TrendingUp className="w-6 h-6" /></div>
              <div><p className="text-sm text-primary-foreground/90">إجمالي الدخل</p><p className="text-3xl font-bold">{totalIncome.toLocaleString()} ر.س</p></div>
            </div>
          </CardContent>
        </Card>

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
              <Table className="min-w-[650px]">
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
                        {!isClosed && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: item.id, name: `دخل ${item.source}` })} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
