import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useIncome, useCreateIncome, useUpdateIncome, useDeleteIncome } from '@/hooks/useIncome';
import { useProperties } from '@/hooks/useProperties';
import { Income } from '@/types/database';
import { Plus, Trash2, TrendingUp, Edit } from 'lucide-react';
import { toast } from 'sonner';

const IncomePage = () => {
  const { data: income = [], isLoading } = useIncome();
  const { data: properties = [] } = useProperties();
  const createIncome = useCreateIncome();
  const updateIncome = useUpdateIncome();
  const deleteIncome = useDeleteIncome();

  const [isOpen, setIsOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [formData, setFormData] = useState({
    source: '',
    amount: '',
    date: '',
    property_id: '',
    notes: '',
  });

  const resetForm = () => {
    setFormData({ source: '', amount: '', date: '', property_id: '', notes: '' });
    setEditingIncome(null);
  };

  const handleEdit = (item: Income) => {
    setEditingIncome(item);
    setFormData({
      source: item.source,
      amount: item.amount.toString(),
      date: item.date,
      property_id: item.property_id || '',
      notes: item.notes || '',
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.source || !formData.amount || !formData.date) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const incomeData = {
      source: formData.source,
      amount: parseFloat(formData.amount),
      date: formData.date,
      property_id: formData.property_id || undefined,
      notes: formData.notes || undefined,
    };

    if (editingIncome) {
      await updateIncome.mutateAsync({ id: editingIncome.id, ...incomeData });
    } else {
      await createIncome.mutateAsync(incomeData);
    }

    setIsOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الدخل؟')) {
      await deleteIncome.mutateAsync(id);
    }
  };

  const totalIncome = income.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">إدارة الدخل</h1>
            <p className="text-muted-foreground mt-1">تسجيل ومتابعة مصادر الدخل</p>
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2">
                <Plus className="w-4 h-4" />
                إضافة دخل
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingIncome ? 'تعديل الدخل' : 'إضافة دخل جديد'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>المصدر *</Label>
                  <Input
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="إيجار، استثمار، تبرع..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>المبلغ (ر.س) *</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="10000"
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
                  <Label>ملاحظات</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="ملاحظات إضافية"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 gradient-primary" disabled={createIncome.isPending || updateIncome.isPending}>
                    {editingIncome ? 'تحديث' : 'إضافة'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Total Income Card */}
        <Card className="shadow-sm gradient-primary text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm opacity-80">إجمالي الدخل</p>
                <p className="text-3xl font-bold">{totalIncome.toLocaleString()} ر.س</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Income Table */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">جاري التحميل...</p>
              </div>
            ) : income.length === 0 ? (
              <div className="py-12 text-center">
                <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد سجلات دخل</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="py-3 px-4 text-right font-medium">المصدر</th>
                      <th className="py-3 px-4 text-right font-medium">المبلغ</th>
                      <th className="py-3 px-4 text-right font-medium">التاريخ</th>
                      <th className="py-3 px-4 text-right font-medium">العقار</th>
                      <th className="py-3 px-4 text-right font-medium">ملاحظات</th>
                      <th className="py-3 px-4 text-right font-medium">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {income.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-muted/30">
                        <td className="py-3 px-4 font-medium">{item.source}</td>
                        <td className="py-3 px-4 text-success font-medium">+{Number(item.amount).toLocaleString()} ر.س</td>
                        <td className="py-3 px-4">{item.date}</td>
                        <td className="py-3 px-4">{item.property?.property_number || '-'}</td>
                        <td className="py-3 px-4 text-muted-foreground">{item.notes || '-'}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default IncomePage;
