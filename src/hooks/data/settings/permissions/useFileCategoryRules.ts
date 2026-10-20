/**
 * قواعد الوصول الفئوية داخل الأرشيف — يقررها الناظر وحده (RLS: admin فقط).
 */
import { createCrudFactory } from '@/hooks/data/core/useCrudFactory';
import type { Database } from '@/integrations/supabase/types';

export type FileCategoryRule = Database['public']['Tables']['file_category_rules']['Row'];

const factory = createCrudFactory<'file_category_rules', FileCategoryRule>({
  table: 'file_category_rules',
  queryKey: 'file_category_rules',
  orderBy: 'category',
  ascending: true,
  limit: 200,
  label: 'قاعدة الفئة',
});

export const useFileCategoryRules = factory.useList;
export const useUpdateFileCategoryRule = factory.useUpdate;
