/**
 * تبويب إدارة السنوات المالية
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Calendar, Plus, Lock, Unlock, Loader2, Trash2, Eye, EyeOff } from 'lucide-react';
import { useFiscalYearManagement } from '@/hooks/page/admin/financial/useFiscalYearManagement';
import ReopenFiscalYearDialog from './ReopenFiscalYearDialog';
import CascadeDeleteFiscalYearDialog from './CascadeDeleteFiscalYearDialog';


const FiscalYearManagementTab = () => {
  const {
    fiscalYears, isLoading, creating, setCreating,
    newFY, setNewFY, actionLoading,
    handleCreate, handleClose, handleReopen, togglePublished, handleDelete, handleCascadeDelete,
  } = useFiscalYearManagement();

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display text-lg flex items-center gap-2"><Calendar className="w-5 h-5" />السنوات المالية</CardTitle>
            <CardDescription>إنشاء وإدارة السنوات المالية</CardDescription>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setCreating(!creating)}><Plus className="w-4 h-4" />سنة جديدة</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {creating && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5"><Label>المسمى</Label><Input value={newFY.label} onChange={e => setNewFY(p => ({ ...p, label: e.target.value }))} placeholder="2025-2026" pattern="\d{4}-\d{4}" /></div>
                  <div className="space-y-1.5"><Label>تاريخ البداية</Label><Input type="date" value={newFY.start_date} onChange={e => setNewFY(p => ({ ...p, start_date: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label>تاريخ النهاية</Label><Input type="date" value={newFY.end_date} onChange={e => setNewFY(p => ({ ...p, end_date: e.target.value }))} /></div>
                </div>
                <p className="text-xs text-muted-foreground">المسمى يجب أن يكون بصيغة <code className="px-1 rounded bg-muted">YYYY-YYYY</code> بفارق سنة واحدة (مثل 2025-2026). لا يُسمح بتداخل المدد الزمنية أو تكرار المسمى، ولا يمكن إنشاء سنة جديدة قبل إقفال السنة النشطة الحالية.</p>
                <p className="text-xs text-caution-foreground">ملاحظة: السنة الجديدة ستكون <strong>محجوبة</strong> عن المستفيدين تلقائياً — يمكنك نشرها بعد إضافة البيانات.</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreate} disabled={actionLoading === 'create'} className="gap-1.5">{actionLoading === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}إنشاء</Button>
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
                    <Badge className={`gap-1 ${fy.published ? 'bg-success/15 text-success border-success/30' : 'bg-caution/15 text-caution-foreground border-caution/30'}`} variant="outline">
                      {fy.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {fy.published ? 'منشورة' : 'محجوبة'}
                    </Badge>
                    <div><p className="font-medium text-sm">{fy.label}</p><p className="text-xs text-muted-foreground">{fy.start_date} → {fy.end_date}</p></div>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {/* نشر / حجب */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className={`gap-1 text-xs ${fy.published ? 'text-caution-foreground hover:text-caution-foreground/80' : 'text-success hover:text-success/80'}`} disabled={actionLoading === `pub-${fy.id}`}>
                          {actionLoading === `pub-${fy.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : fy.published ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {fy.published ? 'حجب' : 'نشر'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{fy.published ? 'حجب السنة المالية' : 'نشر السنة المالية'}</AlertDialogTitle>
                          <AlertDialogDescription>{fy.published ? `هل أنت متأكد من حجب السنة "${fy.label}" عن المستفيدين؟` : `هل أنت متأكد من نشر السنة "${fy.label}" للمستفيدين؟`}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2"><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => togglePublished(fy)}>{fy.published ? 'حجب' : 'نشر'}</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {fy.status === 'active' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="gap-1 text-xs" disabled={actionLoading === fy.id}>{actionLoading === fy.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}إقفال</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>إقفال السنة المالية</AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                              <p>هل أنت متأكد من إقفال "{fy.label}"؟</p>
                              <p className="text-destructive font-medium">⚠ يُفضّل إقفال السنة من صفحة "الحسابات الختامية".</p>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="gap-2"><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => handleClose(fy)}>إقفال</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {fy.status === 'closed' && <ReopenFiscalYearDialog fy={fy} onConfirm={(reason) => handleReopen(fy, reason)} loading={actionLoading === fy.id} />}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive gap-1 text-xs" disabled={actionLoading === fy.id || fy.status === 'active'} title={fy.status === 'active' ? 'استخدم "حذف السنة وكل بياناتها"' : 'حذف'}><Trash2 className="w-3 h-3" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>حذف السنة المالية</AlertDialogTitle><AlertDialogDescription>هل أنت متأكد من حذف السنة "{fy.label}"؟ (تعمل فقط إذا لم تكن مرتبطة ببيانات)</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter className="gap-2"><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(fy)} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <CascadeDeleteFiscalYearDialog fy={fy} onConfirm={() => handleCascadeDelete(fy)} loading={actionLoading === fy.id} />
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
