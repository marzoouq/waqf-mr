/**
 * Page hook: لوحة صلاحيات الملفات للناظر.
 */
import {
  useFileAccessRules,
  useUpdateFileAccessRule,
  type FileAccessRule,
} from '@/hooks/data/settings/permissions/useFileAccessRules';

export type FileAccessFlag = 'can_read' | 'can_download' | 'can_upload' | 'can_delete';

export const BUCKET_LABELS: Record<string, string> = {
  invoices: 'ملفات الفواتير',
  'disbursement-vouchers': 'سندات الصرف',
  'waqf-documents': 'وثائق الأرشيف',
  'waqf-assets': 'الأصول والقوالب',
};

export const FLAG_LABELS: Record<FileAccessFlag, string> = {
  can_read: 'معاينة',
  can_download: 'تنزيل',
  can_upload: 'رفع',
  can_delete: 'حذف',
};

export function useFileAccessRulesPanel() {
  const { data, isLoading } = useFileAccessRules();
  const update = useUpdateFileAccessRule();
  const rules = (data ?? []) as FileAccessRule[];

  const toggle = (rule: FileAccessRule, flag: FileAccessFlag, value: boolean) => {
    update.mutate({ id: rule.id, [flag]: value, updated_at: new Date().toISOString() });
  };

  return { rules, isLoading, toggle, saving: update.isPending };
}
