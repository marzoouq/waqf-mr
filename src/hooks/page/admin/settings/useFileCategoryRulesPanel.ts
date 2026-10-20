/**
 * Page hook: صلاحيات فئات الأرشيف.
 */
import {
  useFileCategoryRules, useUpdateFileCategoryRule, type FileCategoryRule,
} from '@/hooks/data/settings/permissions/useFileCategoryRules';
import type { FileAccessFlag } from './useFileAccessRulesPanel';

export function useFileCategoryRulesPanel() {
  const { data, isLoading } = useFileCategoryRules();
  const update = useUpdateFileCategoryRule();
  const rules = (data ?? []) as FileCategoryRule[];

  const toggle = (rule: FileCategoryRule, flag: FileAccessFlag, value: boolean) => {
    update.mutate({ id: rule.id, [flag]: value, updated_at: new Date().toISOString() });
  };

  return { rules, isLoading, toggle, saving: update.isPending };
}
