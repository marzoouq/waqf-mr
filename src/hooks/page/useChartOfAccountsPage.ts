/**
 * هوك منطق صفحة الشجرة المحاسبية
 */
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  useAccountCategoryTree,
  useCreateAccountCategory,
  useUpdateAccountCategory,
  useDeleteAccountCategory,
} from '@/hooks/data/financial/useAccountCategories';
import type { AccountCategory } from '@/types/database';
import type { CategoryTreeNode } from '@/hooks/data/financial/useAccountCategories';

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

export function useChartOfAccountsPage() {
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

  const stats = useMemo(() => {
    const total = categories.length;
    const income = categories.filter(c => c.category_type === 'income').length;
    const expense = categories.filter(c => c.category_type === 'expense').length;
    const active = categories.filter(c => c.is_active).length;
    return { total, income, expense, active, inactive: total - active };
  }, [categories]);

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

  const parentCandidates = useMemo(() => {
    if (!editingCategory) return categories;
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

  const openCreateDialog = () => {
    setEditingCategory(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

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

  const handleDelete = () => {
    if (!deletingCategory) return;
    deleteMutation.mutate(deletingCategory.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setDeletingCategory(null);
      },
    });
  };

  const handleToggle = (id: string, active: boolean) => {
    updateMutation.mutate({ id, is_active: active });
  };

  const confirmDelete = (cat: AccountCategory) => {
    setDeletingCategory(cat);
    setDeleteDialogOpen(true);
  };

  return {
    isLoading,
    // بحث
    searchTerm, setSearchTerm,
    // حوارات
    dialogOpen, setDialogOpen, deleteDialogOpen, setDeleteDialogOpen,
    editingCategory, deletingCategory,
    form, setForm,
    // بيانات
    stats, filteredTree, parentCandidates,
    // إجراءات
    openCreateDialog, openEditDialog, handleSave, handleDelete, handleToggle, confirmDelete,
    // حالات mutation
    createPending: createMutation.isPending,
    updatePending: updateMutation.isPending,
  };
}
