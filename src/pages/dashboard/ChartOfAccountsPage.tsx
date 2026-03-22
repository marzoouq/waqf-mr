/**
 * صفحة الشجرة المحاسبية — عرض هرمي + CRUD كامل
 */
import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeaderCard from '@/components/PageHeaderCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  GitBranch, Plus, Search, X, Loader2, Pencil, Trash2,
  ChevronDown, DollarSign, Receipt, Calculator, ArrowDownUp,
  FolderTree,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useAccountCategoryTree,
  useCreateAccountCategory,
  useUpdateAccountCategory,
  useDeleteAccountCategory,
  type CategoryTreeNode,
} from '@/hooks/useAccountCategories';
import type { AccountCategory } from '@/types/database';

// ─── ثوابت الألوان والأنواع ───
const TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof DollarSign }> = {
  income: { label: 'إيراد', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: DollarSign },
  expense: { label: 'مصروف', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: Receipt },
  tax: { label: 'ضريبة', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: Calculator },
  distribution: { label: 'توزيع', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: ArrowDownUp },
};

type CategoryType = 'income' | 'expense' | 'tax' | 'distribution';

interface FormState {
  code: string;
  name: string;
  category_type: CategoryType;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
}

const emptyForm: FormState = {
  code: '', name: '', category_type: 'expense', parent_id: null, sort_order: 0, is_active: true,
};

// ─── مكوّن الصف الفرعي ───
function CategoryRow({
  node,
  depth,
  onEdit,
  onDelete,
  onToggle,
  hasChildren,
}: {
  node: CategoryTreeNode;
  depth: number;
  onEdit: (cat: AccountCategory) => void;
  onDelete: (cat: AccountCategory) => void;
  onToggle: (id: string, active: boolean) => void;
  hasChildren: boolean;
}) {
  const cfg = TYPE_CONFIG[node.category_type] || TYPE_CONFIG.expense;
  const Icon = cfg.icon;

  return (
    <div
      className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors"
      style={{ paddingRight: `${Math.min(12 + depth * 16, 64)}px` }}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
        <span className="font-mono text-xs text-muted-foreground hidden sm:inline">{node.code}</span>
        <span className={`text-sm font-medium truncate ${!node.is_active ? 'line-through text-muted-foreground' : ''}`}>
          {node.name}
        </span>
        <Badge variant="secondary" className={`text-[11px] px-1.5 py-0 ${cfg.color}`}>
          {cfg.label}
        </Badge>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Switch
          checked={node.is_active}
          onCheckedChange={(v) => onToggle(node.id, v)}
          className="scale-75"
        />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(node)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={() => onDelete(node)}
          disabled={hasChildren}
          title={hasChildren ? 'لا يمكن حذف فئة لها فروع' : 'حذف'}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── مكوّن الشجرة المتداخلة ───
function TreeBranch({
  nodes,
  depth,
  onEdit,
  onDelete,
  onToggle,
  searchTerm,
}: {
  nodes: CategoryTreeNode[];
  depth: number;
  onEdit: (cat: AccountCategory) => void;
  onDelete: (cat: AccountCategory) => void;
  onToggle: (id: string, active: boolean) => void;
  searchTerm: string;
}) {
  return (
    <>
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;

        if (hasChildren) {
          return (
            <Collapsible key={node.id} defaultOpen>
              <CollapsibleTrigger asChild>
                <div className="cursor-pointer">
                  <div className="flex items-center gap-1">
                    <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=closed]:rotate-90 rtl:group-data-[state=closed]:-rotate-90" />
                    <div className="flex-1">
                      <CategoryRow
                        node={node}
                        depth={depth}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onToggle={onToggle}
                        hasChildren={hasChildren}
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-r-2 border-muted mr-4">
                  <TreeBranch
                    nodes={node.children}
                    depth={depth + 1}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggle={onToggle}
                    searchTerm={searchTerm}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        }

        return (
          <CategoryRow
            key={node.id}
            node={node}
            depth={depth}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggle={onToggle}
            hasChildren={false}
          />
        );
      })}
    </>
  );
}

// ─── الصفحة الرئيسية ───
const ChartOfAccountsPage = () => {
  const { tree, categories, isLoading } = useAccountCategoryTree();
  const createMutation = useCreateAccountCategory();
  const updateMutation = useUpdateAccountCategory();
  const deleteMutation = useDeleteAccountCategory();

  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AccountCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<AccountCategory | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  // ─── إحصائيات ───
  const stats = useMemo(() => {
    const total = categories.length;
    const income = categories.filter(c => c.category_type === 'income').length;
    const expense = categories.filter(c => c.category_type === 'expense').length;
    const active = categories.filter(c => c.is_active).length;
    return { total, income, expense, active, inactive: total - active };
  }, [categories]);

  // ─── فلترة البحث ───
  const filteredTree = useMemo(() => {
    if (!searchTerm.trim()) return tree;

    const term = searchTerm.toLowerCase();
    function filterNodes(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
      return nodes.reduce<CategoryTreeNode[]>((acc, node) => {
        const matchesSelf = node.name.toLowerCase().includes(term) || node.code.includes(term);
        const filteredChildren = filterNodes(node.children);
        if (matchesSelf || filteredChildren.length > 0) {
          acc.push({ ...node, children: matchesSelf ? node.children : filteredChildren });
        }
        return acc;
      }, []);
    }
    return filterNodes(tree);
  }, [tree, searchTerm]);

  // ─── فئات متاحة لاختيار الأب (كل الفئات ما عدا الفئة المُعدَّلة وفروعها) ───
  const parentCandidates = useMemo(() => {
    if (!editingCategory) return categories;
    // جمع معرّفات الفئة المُعدَّلة وجميع أحفادها لمنع الحلقات
    const excludeIds = new Set<string>();
    const collectDescendants = (parentId: string) => {
      excludeIds.add(parentId);
      for (const c of categories) {
        if (c.parent_id === parentId && !excludeIds.has(c.id)) {
          collectDescendants(c.id);
        }
      }
    };
    collectDescendants(editingCategory.id);
    return categories.filter(c => !excludeIds.has(c.id));
  }, [categories, editingCategory]);

  // ─── فتح Dialog للإضافة ───
  const openCreateDialog = () => {
    setEditingCategory(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  // ─── فتح Dialog للتعديل ───
  const openEditDialog = (cat: AccountCategory) => {
    setEditingCategory(cat);
    setForm({
      code: cat.code,
      name: cat.name,
      category_type: cat.category_type as CategoryType,
      parent_id: cat.parent_id ?? null,
      sort_order: cat.sort_order,
      is_active: cat.is_active,
    });
    setDialogOpen(true);
  };

  // ─── حفظ (إضافة أو تعديل) ───
  const handleSave = () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('يرجى تعبئة الكود والاسم');
      return;
    }

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      category_type: form.category_type,
      parent_id: form.parent_id || null,
      sort_order: form.sort_order,
      is_active: form.is_active,
    };

    if (editingCategory) {
      updateMutation.mutate(
        { id: editingCategory.id, ...payload },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createMutation.mutate(payload as Parameters<typeof createMutation.mutate>[0], {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  // ─── حذف ───
  const handleDelete = () => {
    if (!deletingCategory) return;
    deleteMutation.mutate(deletingCategory.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setDeletingCategory(null);
      },
    });
  };

  // ─── تفعيل/تعطيل ───
  const handleToggle = (id: string, active: boolean) => {
    updateMutation.mutate({ id, is_active: active });
  };

  // ─── فتح تأكيد الحذف ───
  const confirmDelete = (cat: AccountCategory) => {
    setDeletingCategory(cat);
    setDeleteDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* الترويسة */}
        <PageHeaderCard
          icon={GitBranch}
          title="الشجرة المحاسبية"
          description="إدارة تصنيفات الإيرادات والمصروفات والضرائب والتوزيعات"
          actions={
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة حساب
            </Button>
          }
        />

        {/* بطاقات إحصائية */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'إجمالي الحسابات', value: stats.total, color: 'text-foreground' },
            { label: 'إيرادات', value: stats.income, color: 'text-emerald-600' },
            { label: 'مصروفات', value: stats.expense, color: 'text-red-600' },
            { label: 'نشطة / معطلة', value: `${stats.active} / ${stats.inactive}`, color: 'text-blue-600' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* شريط البحث */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالكود أو الاسم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-9"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchTerm('')}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* العرض الهرمي */}
        <Card>
          <CardContent className="p-2 sm:p-4 overflow-x-auto">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredTree.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <FolderTree className="w-12 h-12 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'لا توجد نتائج مطابقة' : 'لا توجد حسابات بعد'}
                </p>
                {!searchTerm && (
                  <Button variant="outline" onClick={openCreateDialog} className="gap-2">
                    <Plus className="w-4 h-4" />
                    إضافة أول حساب
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <TreeBranch
                  nodes={filteredTree}
                  depth={0}
                  onEdit={openEditDialog}
                  onDelete={confirmDelete}
                  onToggle={handleToggle}
                  searchTerm={searchTerm}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Dialog إضافة/تعديل ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'تعديل حساب' : 'إضافة حساب جديد'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>الكود</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))}
                  placeholder="مثال: 110"
                  maxLength={10}
                />
              </div>
              <div className="space-y-1.5">
                <Label>الترتيب</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>اسم الحساب</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="مثال: إيجارات تجارية"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label>النوع</Label>
              <Select
                value={form.category_type}
                onValueChange={(v) => setForm(p => ({ ...p, category_type: v as CategoryType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">إيراد</SelectItem>
                  <SelectItem value="expense">مصروف</SelectItem>
                  <SelectItem value="tax">ضريبة</SelectItem>
                  <SelectItem value="distribution">توزيع</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>الفئة الأب (اختياري)</Label>
              <Select
                value={form.parent_id ?? '__none__'}
                onValueChange={(v) => setForm(p => ({ ...p, parent_id: v === '__none__' ? null : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="بدون فئة أب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">بدون فئة أب</SelectItem>
                  {rootCategories
                    .filter(c => c.id !== editingCategory?.id)
                    .map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              )}
              {editingCategory ? 'حفظ التعديلات' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── AlertDialog تأكيد الحذف ─── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الحساب</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف «{deletingCategory?.name}» (كود: {deletingCategory?.code})؟
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default ChartOfAccountsPage;
