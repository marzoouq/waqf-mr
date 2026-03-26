/**
 * صفحة الشجرة المحاسبية — عرض هرمي + CRUD كامل
 */
import DashboardLayout from '@/components/DashboardLayout';
import PageHeaderCard from '@/components/PageHeaderCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GitBranch, Plus, Search, X, Loader2, FolderTree } from 'lucide-react';
import { TreeBranch } from '@/components/chart-of-accounts/CategoryTreeView';
import { useChartOfAccountsPage } from '@/hooks/page/useChartOfAccountsPage';

const ChartOfAccountsPage = () => {
  const {
    isLoading,
    searchTerm, setSearchTerm,
    dialogOpen, setDialogOpen, deleteDialogOpen, setDeleteDialogOpen,
    editingCategory, deletingCategory,
    form, setForm,
    stats, filteredTree, parentCandidates,
    openCreateDialog, openEditDialog, handleSave, handleDelete, handleToggle, confirmDelete,
    createPending, updatePending,
  } = useChartOfAccountsPage();

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <PageHeaderCard
          icon={GitBranch}
          title="الشجرة المحاسبية"
          description="إدارة تصنيفات الإيرادات والمصروفات والضرائب والتوزيعات"
          actions={<Button onClick={openCreateDialog} className="gap-2"><Plus className="w-4 h-4" />إضافة حساب</Button>}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'إجمالي الحسابات', value: stats.total, color: 'text-foreground' },
            { label: 'إيرادات', value: stats.income, color: 'text-success' },
            { label: 'مصروفات', value: stats.expense, color: 'text-destructive' },
            { label: 'نشطة / معطلة', value: `${stats.active} / ${stats.inactive}`, color: 'text-info' },
          ].map((s) => (
            <Card key={s.label}><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">{s.label}</p><p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالكود أو الاسم..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-9" />
          {searchTerm && <Button variant="ghost" size="icon" className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm('')}><X className="w-4 h-4" /></Button>}
        </div>

        <Card>
          <CardContent className="p-2 sm:p-4 overflow-x-auto">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : filteredTree.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <FolderTree className="w-12 h-12 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground">{searchTerm ? 'لا توجد نتائج مطابقة' : 'لا توجد حسابات بعد'}</p>
                {!searchTerm && <Button variant="outline" onClick={openCreateDialog} className="gap-2"><Plus className="w-4 h-4" />إضافة أول حساب</Button>}
              </div>
            ) : (
              <div className="space-y-1">
                <TreeBranch nodes={filteredTree} depth={0} onEdit={openEditDialog} onDelete={confirmDelete} onToggle={handleToggle} searchTerm={searchTerm} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingCategory ? 'تعديل حساب' : 'إضافة حساب جديد'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="chart-code">الكود</Label><Input id="chart-code" value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} placeholder="مثال: 110" maxLength={10} /></div>
              <div className="space-y-1.5"><Label htmlFor="chart-sort">الترتيب</Label><Input id="chart-sort" type="number" value={form.sort_order} onChange={(e) => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))} /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="chart-name">اسم الحساب</Label><Input id="chart-name" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: إيجارات تجارية" maxLength={100} /></div>
            <div className="space-y-1.5">
              <Label htmlFor="chart-category-type">النوع</Label>
              <Select value={form.category_type} onValueChange={(v) => setForm(p => ({ ...p, category_type: v as 'income' | 'expense' | 'tax' | 'distribution' }))}>
                <SelectTrigger id="chart-category-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">إيراد</SelectItem>
                  <SelectItem value="expense">مصروف</SelectItem>
                  <SelectItem value="tax">ضريبة</SelectItem>
                  <SelectItem value="distribution">توزيع</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chart-parent">الفئة الأب (اختياري)</Label>
              <Select value={form.parent_id ?? '__none__'} onValueChange={(v) => setForm(p => ({ ...p, parent_id: v === '__none__' ? null : v }))}>
                <SelectTrigger id="chart-parent"><SelectValue placeholder="بدون فئة أب" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">بدون فئة أب</SelectItem>
                  {parentCandidates.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={createPending || updatePending}>
              {(createPending || updatePending) && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              {editingCategory ? 'حفظ التعديلات' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الحساب</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف «{deletingCategory?.name}» (كود: {deletingCategory?.code})؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default ChartOfAccountsPage;
