/**
 * هوكات إدارة الشجرة المحاسبية (CRUD)
 * يوفر: useAccountCategories, useCreateAccountCategory, useUpdateAccountCategory, useDeleteAccountCategory
 * الجدول: account_categories | الترتيب: حسب sort_order
 */
import { createCrudFactory } from './useCrudFactory';
import { useMemo } from 'react';
import type { AccountCategory } from '@/types/database';

const categoryCrud = createCrudFactory<'account_categories', AccountCategory>({
  table: 'account_categories',
  queryKey: 'account_categories',
  select: '*',
  orderBy: 'sort_order',
  ascending: true,
  label: 'الحساب',
});

export const useAccountCategories = categoryCrud.useList;
export const useCreateAccountCategory = categoryCrud.useCreate;
export const useUpdateAccountCategory = categoryCrud.useUpdate;
export const useDeleteAccountCategory = categoryCrud.useDelete;

/** نوع الشجرة مع الفروع */
export interface CategoryTreeNode extends AccountCategory {
  children: CategoryTreeNode[];
}

/** تحويل القائمة المسطحة إلى شجرة هرمية */
export function buildCategoryTree(categories: AccountCategory[]): CategoryTreeNode[] {
  const map = new Map<string, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  // إنشاء العقد
  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }

  // بناء العلاقات
  for (const cat of categories) {
    const node = map.get(cat.id)!;
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** Hook يُرجع الشجرة الهرمية */
export function useAccountCategoryTree() {
  const { data: categories, isLoading, error } = useAccountCategories();

  const tree = useMemo(
    () => buildCategoryTree(categories ?? []),
    [categories],
  );

  return { tree, categories: categories ?? [], isLoading, error };
}
