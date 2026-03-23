/** تبويب تأجير العقار كامل */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { NativeSelect } from '@/components/ui/native-select';
import { Building2, Edit, Plus } from 'lucide-react';
import { PAYMENT_TYPES } from './constants';
import { fmt } from '@/utils/format';
import type { Contract } from '@/types/database';

interface WholePropertyTabProps {
  wholePropertyContract: Contract | null;
  onSave: (form: WholeRentalForm) => Promise<void>;
  isPending: boolean;
}

export interface WholeRentalForm {
  tenant_name: string;
  rent_amount: string;
  payment_type: string;
  payment_count: string;
  start_date: string;
  end_date: string;
}

const WholePropertyTab = ({ wholePropertyContract, onSave, isPending }: WholePropertyTabProps) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<WholeRentalForm>({
    tenant_name: '',
    rent_amount: '',
    payment_type: 'annual',
    payment_count: '1',
    start_date: '',
    end_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form);
    setIsFormOpen(false);
  };

  const openEditForm = () => {
    if (wholePropertyContract) {
      setForm({
        tenant_name: wholePropertyContract.tenant_name,
        rent_amount: wholePropertyContract.rent_amount.toString(),
        payment_type: wholePropertyContract.payment_type || 'annual',
        payment_count: wholePropertyContract.payment_count?.toString() || '1',
        start_date: wholePropertyContract.start_date,
        end_date: wholePropertyContract.end_date,
      });
    } else {
      setForm({ tenant_name: '', rent_amount: '', payment_type: 'annual', payment_count: '1', start_date: '', end_date: '' });
    }
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-4 mt-4">
      {wholePropertyContract ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold text-lg">بيانات عقد العقار كامل</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">المستأجر</p>
                <p className="font-medium">{wholePropertyContract.tenant_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الإيجار السنوي</p>
                <p className="font-medium">{fmt(wholePropertyContract.rent_amount)} ريال</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">نوع الدفع</p>
                <p className="font-medium">{PAYMENT_TYPES.find(t => t.value === wholePropertyContract.payment_type)?.label || wholePropertyContract.payment_type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">عدد الدفعات</p>
                <p className="font-medium">{wholePropertyContract.payment_count}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">قيمة الدفعة</p>
                <p className="font-medium">{fmt(wholePropertyContract.payment_amount || 0)} ريال</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الحالة</p>
                <Badge variant={wholePropertyContract.status === 'active' ? 'default' : 'secondary'}>{wholePropertyContract.status === 'active' ? 'ساري' : 'منتهي'}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">بداية العقد</p>
                <p className="font-medium">{wholePropertyContract.start_date}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">نهاية العقد</p>
                <p className="font-medium">{wholePropertyContract.end_date}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={openEditForm}>
              <Edit className="w-4 h-4 ml-2" /> تعديل العقد
            </Button>
          </CardContent>
        </Card>
      ) : !isFormOpen ? (
        <div className="text-center py-8 space-y-3">
          <Building2 className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">لا يوجد عقد لتأجير العقار كامل</p>
          <Button onClick={openEditForm}>
            <Plus className="w-4 h-4 ml-2" /> إضافة عقد للعقار
          </Button>
        </div>
      ) : null}

      {isFormOpen && (
        <Card className="border-primary/20">
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <h4 className="font-semibold text-sm text-primary">بيانات عقد العقار كامل</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">اسم المستأجر *</Label>
                  <Input value={form.tenant_name} onChange={(e) => setForm({ ...form, tenant_name: e.target.value })} placeholder="اسم المستأجر" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">قيمة الإيجار السنوي *</Label>
                  <Input type="number" value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: e.target.value })} placeholder="50000" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">نوع الدفع</Label>
                  <NativeSelect value={form.payment_type} onValueChange={(v) => setForm({ ...form, payment_type: v })} options={PAYMENT_TYPES} />
                </div>
                {form.payment_type === 'multi' && (
                  <div className="space-y-1">
                    <Label className="text-xs">عدد الدفعات</Label>
                    <Input type="number" value={form.payment_count} onChange={(e) => setForm({ ...form, payment_count: e.target.value })} placeholder="4" min="1" />
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">تاريخ بداية العقد *</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">تاريخ نهاية العقد *</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              {form.rent_amount && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <span className="text-muted-foreground">قيمة الدفعة الواحدة: </span>
                  <span className="font-semibold">
                    {fmt(parseFloat(form.rent_amount) / (form.payment_type === 'monthly' ? 12 : form.payment_type === 'multi' ? parseInt(form.payment_count || '1') : 1))} ريال
                  </span>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button type="submit" size="sm" disabled={isPending}>
                  {wholePropertyContract ? 'تحديث العقد' : 'إنشاء العقد'}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setIsFormOpen(false)}>إلغاء</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WholePropertyTab;
