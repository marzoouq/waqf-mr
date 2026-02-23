/**
 * تبويب إدارة السنوات المالية
 * إنشاء / إقفال / إعادة فتح السنوات المالية
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Plus, Lock, Unlock, Loader2, Trash2, Eye, EyeOff } from 'lucide-react';
import { useFiscalYears, type FiscalYear } from '@/hooks/useFiscalYears';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const FiscalYearManagementTab = () => {
  const { data: fiscalYears = [], isLoading } = useFiscalYears();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [newFY, setNewFY] = useState({ label: '', start_date: '', end_date: '' });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newFY.label || !newFY.start_date || !newFY.end_date) {
      toast.error('يرجى تعبئة جميع الحقول');
      return;
    }
    setActionLoading('create');
    try {
      const { error } = await supabase.from('fiscal_years').insert({
        label: newFY.label,
        start_date: newFY.start_date,
        end_date: newFY.end_date,
        status: 'active',
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['fiscal_years'] });
      toast.success('تم إنشاء السنة المالية بنجاح');
      setNewFY({ label: '', start_date: '', end_date: '' });
      setCreating(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ أثناء الإنشاء');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleStatus = async (fy: FiscalYear) => {
    const newStatus = fy.status === 'active' ? 'closed' : 'active';
    setActionLoading(fy.id);
    try {
      const { error } = await supabase.from('fiscal_years').update({ status: newStatus }).eq('id', fy.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['fiscal_years'] });
      toast.success(newStatus === 'closed' ? `تم إقفال السنة: ${fy.label}` : `تم إعادة فتح السنة: ${fy.label}`);
    } catch {
      toast.error('حدث خطأ أثناء تحديث الحالة');
    } finally {
      setActionLoading(null);
    }
  };

  const togglePublished = async (fy: FiscalYear) => {
    const newVal = !fy.published;
    setActionLoading(`pub-${fy.id}`);
    try {
      const { error } = await supabase.from('fiscal_years').update({ published: newVal } as any).eq('id', fy.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['fiscal_years'] });
      toast.success(newVal ? `تم نشر السنة "${fy.label}" للمستفيدين` : `تم حجب السنة "${fy.label}" عن المستفيدين`);
    } catch {
      toast.error('حدث خطأ أثناء تحديث حالة النشر');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (fy: FiscalYear) => {
    setActionLoading(fy.id);
    try {
      const { error } = await supabase.from('fiscal_years').delete().eq('id', fy.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['fiscal_years'] });
      toast.success(`تم حذف السنة: ${fy.label}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error && err.message?.includes('violates foreign key') ? 'لا يمكن حذف سنة مرتبطة ببيانات' : 'حدث خطأ أثناء الحذف');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              السنوات المالية
            </CardTitle>
            <CardDescription>إنشاء وإدارة السنوات المالية</CardDescription>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setCreating(!creating)}>
            <Plus className="w-4 h-4" />
            سنة جديدة
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {creating && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>المسمى</Label>
                    <Input value={newFY.label} onChange={e => setNewFY(p => ({ ...p, label: e.target.value }))} placeholder="مثال: 1447-1448هـ" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>تاريخ البداية</Label>
                    <Input type="date" value={newFY.start_date} onChange={e => setNewFY(p => ({ ...p, start_date: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>تاريخ النهاية</Label>
                    <Input type="date" value={newFY.end_date} onChange={e => setNewFY(p => ({ ...p, end_date: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreate} disabled={actionLoading === 'create'} className="gap-1.5">
                    {actionLoading === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    إنشاء
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>إلغاء</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {fiscalYears.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد سنوات مالية بعد</p>
          ) : (
            <div className="space-y-2">
              {fiscalYears.map(fy => (
                <div key={fy.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant={fy.status === 'active' ? 'default' : 'secondary'} className="gap-1">
                      {fy.status === 'active' ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {fy.status === 'active' ? 'نشطة' : 'مقفلة'}
                    </Badge>
                    <Badge
                      className={`gap-1 ${fy.published ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700' : 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700'}`}
                      variant="outline"
                    >
                      {fy.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {fy.published ? 'منشورة' : 'محجوبة'}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{fy.label}</p>
                      <p className="text-xs text-muted-foreground">{fy.start_date} → {fy.end_date}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`gap-1 text-xs ${fy.published ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}`}
                          disabled={actionLoading === `pub-${fy.id}`}
                        >
                          {actionLoading === `pub-${fy.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : fy.published ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {fy.published ? 'حجب' : 'نشر'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{fy.published ? 'حجب السنة المالية' : 'نشر السنة المالية'}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {fy.published
                              ? `هل أنت متأكد من حجب السنة "${fy.label}" عن المستفيدين؟ لن تظهر لهم في التقارير والحسابات.`
                              : `هل أنت متأكد من نشر السنة "${fy.label}" للمستفيدين؟ ستظهر لهم في التقارير والحسابات.`
                            }
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction onClick={() => togglePublished(fy)}>
                            {fy.published ? 'حجب' : 'نشر'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-xs"
                      disabled={actionLoading === fy.id}
                      onClick={() => toggleStatus(fy)}
                    >
                      {actionLoading === fy.id ? <Loader2 className="w-3 h-3 animate-spin" /> : fy.status === 'active' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      {fy.status === 'active' ? 'إقفال' : 'إعادة فتح'}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive gap-1 text-xs" disabled={actionLoading === fy.id}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>حذف السنة المالية</AlertDialogTitle>
                          <AlertDialogDescription>
                            هل أنت متأكد من حذف السنة "{fy.label}"؟ لا يمكن حذف سنة مرتبطة ببيانات مالية.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(fy)} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FiscalYearManagementTab;
