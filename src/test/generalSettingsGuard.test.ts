/**
 * حارس ملاحظات الإعدادات العامة (2026-11-05)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { MENU_ITEMS } from '@/hooks/page/admin/settings/useMenuCustomizationTab';
import { defaultMenuLabels } from '@/types/navigation';
import { buildXlsxWorkbook, sanitizeSheetName } from '@/utils/export/xlsx';
import { FINANCIAL_FIELDS } from '@/hooks/page/admin/settings/useWaqfSettingsTab';

const read = (p: string) => readFileSync(p, 'utf8');

describe('General settings guard', () => {
  it('شريط التنبيه يظهر لكل الأدوار', () => {
    expect(read('src/components/layout/DashboardLayout.tsx')).not.toMatch(/role === 'accountant'\) && <BetaBanner/);
  });

  it('قائمة التخصيص تغطي كل مسميات القائمة', () => {
    expect(MENU_ITEMS.map((i) => i.key).sort()).toEqual(Object.keys(defaultMenuLabels).sort());
    expect(MENU_ITEMS.length).toBeGreaterThanOrEqual(26);
  });

  it('التصدير الشامل ينتج ملفاً واحداً لا تنزيلات متتالية', () => {
    const src = read('src/hooks/application/useDataExport.ts');
    expect(src).toContain('buildXlsxWorkbook(sheets)');
    const blob = buildXlsxWorkbook([
      { name: 'العقارات', data: [{ a: 1 }] },
      { name: 'العقود', data: [{ b: 2 }] },
      { name: 'فارغ', data: [] },
    ]);
    expect(blob.size).toBeGreaterThan(0);
    expect(sanitizeSheetName('a/b:c', 0)).toBe('a b c');
  });

  it('السنة المالية ليست حقلاً قابلاً للتعديل في بيانات الوقف', () => {
    expect(FINANCIAL_FIELDS.some((f) => f.key === 'fiscal_year')).toBe(false);
  });

  it('المستفيد بلا حساب لا يمكن اختياره في الإشعار الجماعي', () => {
    expect(read('src/components/settings/messaging/BulkNotificationsTab.tsx')).toContain('disabled={!b.user_id}');
  });

  it('ملف تبويب الأقسام القديم محذوف', () => {
    expect(existsSync('src/components/settings/system/SectionsTab.tsx')).toBe(false);
  });
});
