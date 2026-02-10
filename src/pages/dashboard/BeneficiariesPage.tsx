import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useBeneficiaries, useCreateBeneficiary, useUpdateBeneficiary, useDeleteBeneficiary } from '@/hooks/useBeneficiaries';
import { Beneficiary } from '@/types/database';
import { Plus, Edit, Trash2, Users, Phone, Mail, CreditCard, Percent, UserCheck, Link, IdCard } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';

interface AuthUser {
  id: string;
  email: string;
}

const BeneficiariesPage = () => {
  const { data: beneficiaries = [], isLoading } = useBeneficiaries();
  const createBeneficiary = useCreateBeneficiary();
  const updateBeneficiary = useUpdateBeneficiary();
  const deleteBeneficiary = useDeleteBeneficiary();

  // Fetch users with beneficiary role
  const { data: users = [] } = useQuery({
    queryKey: ['beneficiary-users'],
    queryFn: async () => {
      // Get users who have the beneficiary role
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'beneficiary');
      
      if (error) throw error;
      
      // For now, return the user IDs - in a real app, you'd join with a profiles table
      return userRoles.map(ur => ({ id: ur.user_id, email: ur.user_id })) as AuthUser[];
    },
  });

  const [isOpen, setIsOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    share_percentage: '',
    phone: '',
    email: '',
    bank_account: '',
    notes: '',
    user_id: '',
    national_id: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      share_percentage: '',
      phone: '',
      email: '',
      bank_account: '',
      notes: '',
      user_id: '',
      national_id: '',
    });
    setEditingBeneficiary(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.share_percentage) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const beneficiaryData = {
      name: formData.name,
      share_percentage: parseFloat(formData.share_percentage),
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      bank_account: formData.bank_account || undefined,
      notes: formData.notes || undefined,
      user_id: formData.user_id || undefined,
      national_id: formData.national_id || undefined,
    };

    if (editingBeneficiary) {
      await updateBeneficiary.mutateAsync({ id: editingBeneficiary.id, ...beneficiaryData });
    } else {
      await createBeneficiary.mutateAsync(beneficiaryData);
    }

    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (beneficiary: Beneficiary) => {
    setEditingBeneficiary(beneficiary);
    setFormData({
      name: beneficiary.name,
      share_percentage: beneficiary.share_percentage.toString(),
      phone: beneficiary.phone || '',
      email: beneficiary.email || '',
      bank_account: beneficiary.bank_account || '',
      notes: beneficiary.notes || '',
      user_id: beneficiary.user_id || '',
      national_id: beneficiary.national_id || '',
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المستفيد؟')) {
      await deleteBeneficiary.mutateAsync(id);
    }
  };

  const totalPercentage = beneficiaries.reduce((sum, b) => sum + Number(b.share_percentage), 0);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">إدارة المستفيدين</h1>
            <p className="text-muted-foreground mt-1">عرض وإدارة المستفيدين من الوقف</p>
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2">
                <Plus className="w-4 h-4" />
                إضافة مستفيد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingBeneficiary ? 'تعديل المستفيد' : 'إضافة مستفيد جديد'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pl-2">
                <div className="space-y-2">
                  <Label>الاسم *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="اسم المستفيد"
                  />
                </div>
                <div className="space-y-2">
                  <Label>نسبة الحصة (%) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.share_percentage}
                    onChange={(e) => setFormData({ ...formData, share_percentage: e.target.value })}
                    placeholder="7.14"
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم الحساب البنكي</Label>
                  <Input
                    value={formData.bank_account}
                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                    placeholder="SA..."
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <IdCard className="w-4 h-4" />
                    رقم الهوية الوطنية
                  </Label>
                  <Input
                    value={formData.national_id}
                    onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                    placeholder="1234567890"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Link className="w-4 h-4" />
                    ربط بحساب مستخدم
                  </Label>
                  <Input
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    placeholder="معرف المستخدم (UUID)"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">
                    أدخل معرف المستخدم من جدول المستخدمين لربط هذا المستفيد بحسابه
                  </p>
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
                  <Button type="submit" className="flex-1 gradient-primary" disabled={createBeneficiary.isPending || updateBeneficiary.isPending}>
                    {editingBeneficiary ? 'تحديث' : 'إضافة'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">عدد المستفيدين</p>
                  <p className="text-3xl font-bold">{beneficiaries.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center">
                  <Percent className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">مجموع النسب</p>
                  <p className="text-3xl font-bold">{totalPercentage.toFixed(2)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Beneficiaries Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        ) : beneficiaries.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا يوجد مستفيدين مسجلين</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {beneficiaries.map((beneficiary) => (
              <Card key={beneficiary.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{beneficiary.name}</CardTitle>
                      {beneficiary.user_id && (
                        <Badge variant="secondary" className="text-xs">
                          <UserCheck className="w-3 h-3 ml-1" />
                          مرتبط
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(beneficiary)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(beneficiary.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-lg font-bold text-primary">
                    <Percent className="w-4 h-4" />
                    <span>{beneficiary.share_percentage}%</span>
                  </div>
                  {beneficiary.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span dir="ltr">{beneficiary.phone}</span>
                    </div>
                  )}
                  {beneficiary.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span dir="ltr">{beneficiary.email}</span>
                    </div>
                  )}
                  {beneficiary.bank_account && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CreditCard className="w-4 h-4" />
                      <span dir="ltr">{beneficiary.bank_account}</span>
                    </div>
                  )}
                  {beneficiary.national_id && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IdCard className="w-4 h-4" />
                      <span dir="ltr">{beneficiary.national_id}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BeneficiariesPage;
