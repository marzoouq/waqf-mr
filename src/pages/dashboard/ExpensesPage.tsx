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
import { Plus, Trash2, TrendingDown, Edit } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';

const EXPENSE_TYPES = [
  'كهرباء',
  'مياه',
  'صيانة',
  'عمالة',
  'منصة إيجار',
  'كتابة عقود',
  'تأمين',
  'ضرائب',
  'أخرى',
];

const ExpensesPage = () => {
  const { data: expenses = [], isLoading } = useExpenses();
  const { data: properties = [] } = useProperties();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [isOpen, setIsOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    expense_type: '',
    amount: '',
    date: '',
    property_id: '',
    description: '',
  });

  const resetForm = () => {
    setFormData({ expense_type: '', amount: '', date: '', property_id: '', description: '' });
    setEditingExpense(null);
  };

  const handleEdit = (item: Expense) => {
    setEditingExpense(item);
    setFormData({
      expense_type: item.expense_type,
      amount: item.amount.toString(),
      date: item.date,
      property_id: item.property_id || '',
      description: item.description || '',
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.expense_type || !formData.amount || !formData.date) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const expenseData = {
      expense_type: formData.expense_type,
      amount: parseFloat(formData.amount),
      date: formData.date,
      property_id: formData.property_id || undefined,
      description: formData.description || undefined,
    };

    if (editingExpense) {
      await updateExpense.mutateAsync({ id: editingExpense.id, ...expenseData });
    } else {
      await createExpense.mutateAsync(expenseData);
    }

    setIsOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
      await deleteExpense.mutateAsync(id);
    }
  };

  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">إدارة المصروفات</h1>
            <p className="text-muted-foreground mt-1">تسجيل ومتابعة المصروفات</p>
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2">
                <Plus className="w-4 h-4" />
                إضافة مصروف
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingExpense ? 'تعديل المصروف' : 'إضافة مصروف جديد'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>نوع المصروف *</Label>
                  <Select value={formData.expense_type} onValueChange={(value) => setFormData({ ...formData, expense_type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع المصروف" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>المبلغ (ر.س) *</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>التاريخ *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>العقار (اختياري)</Label>
                  <Select value={formData.property_id} onValueChange={(value) => setFormData({ ...formData, property_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العقار" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.property_number} - {property.location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الوصف</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="وصف إضافي"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 gradient-primary" disabled={createExpense.isPending || updateExpense.isPending}>
                    {editingExpense ? 'تحديث' : 'إضافة'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Total Expenses Card */}
        <Card className="shadow-sm bg-destructive/10 border-destructive/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-destructive/20 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
                <p className="text-3xl font-bold text-destructive">{totalExpenses.toLocaleString()} ر.س</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Table */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">جاري التحميل...</p>
              </div>
            ) : expenses.length === 0 ? (
              <div className="py-12 text-center">
                <TrendingDown className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد مصروفات مسجلة</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">العقار</TableHead>
                    <TableHead className="text-right">الوصف</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.expense_type}</TableCell>
                      <TableCell className="text-destructive font-medium">-{Number(item.amount).toLocaleString()} ر.س</TableCell>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>{item.property?.property_number || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{item.description || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ExpensesPage;
