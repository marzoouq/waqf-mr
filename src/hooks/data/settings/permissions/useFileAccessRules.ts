/**
 * قواعد الوصول للملفات — يقررها الناظر وحده (RLS: admin فقط).
 */
import { createCrudFactory } from '@/hooks/data/core/useCrudFactory';
import type { Database } from '@/integrations/supabase/types';

export type FileAccessRule = Database['public']['Tables']['file_access_rules']['Row'];

const factory = createCrudFactory<'file_access_rules', FileAccessRule>({
  table: 'file_access_rules',
  queryKey: 'file_access_rules',
  orderBy: 'bucket_id',
  ascending: true,
  limit: 200,
  label: 'قاعدة الوصول',
});

export const useFileAccessRules = factory.useList;
export const useUpdateFileAccessRule = factory.useUpdate;
