/**
 * تحقق أن لوحة الصلاحيات لا تستطيع كتابة `settings:false` أو `users:false`
 * إلى DB حتى لو حاول المستخدم تبديل المفتاح أو إعادة الضبط الافتراضي.
 *
 * نتجنّب renderHook/JSDOM لتفادي OOM؛ نختبر:
 *  1) ثوابت الحماية في `@/constants/sections` (pure).
 *  2) أن source الـ hook يفرض normalize + guard فعلياً (structural).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PROTECTED_ADMIN_SECTIONS,
  isProtectedAdminSection,
} from '@/constants/sections';

const HOOK_PATH = join(
  process.cwd(),
  'src/hooks/page/admin/settings/usePermissionsControlPanel.ts',
);
const hookSrc = readFileSync(HOOK_PATH, 'utf8');

describe('PROTECTED_ADMIN_SECTIONS — pure constants', () => {
  it('يحوي settings و users كحد أدنى', () => {
    expect(PROTECTED_ADMIN_SECTIONS).toEqual(
      expect.arrayContaining(['settings', 'users']),
    );
  });

  it('isProtectedAdminSection يميّز المفاتيح المحمية فقط', () => {
    for (const k of PROTECTED_ADMIN_SECTIONS) {
      expect(isProtectedAdminSection(k)).toBe(true);
    }
    expect(isProtectedAdminSection('expenses')).toBe(false);
    expect(isProtectedAdminSection('invoices')).toBe(false);
    expect(isProtectedAdminSection('__unknown__')).toBe(false);
  });
});

describe('usePermissionsControlPanel — structural write-guard', () => {
  it('toggleAdminSection يستدعي isProtectedAdminSection قبل التحديث', () => {
    const toggleBlock = hookSrc.match(
      /const toggleAdminSection[\s\S]*?\n\s{2}\};/,
    )?.[0];
    expect(toggleBlock, 'toggleAdminSection block must exist').toBeTruthy();
    expect(toggleBlock!).toMatch(/isProtectedAdminSection\(key\)/);
    expect(toggleBlock!).toMatch(/return;/);
  });

  it('يعرّف normalizeAdminSections يفرض true لكل PROTECTED_ADMIN_SECTIONS', () => {
    expect(hookSrc).toMatch(/normalizeAdminSections/);
    expect(hookSrc).toMatch(/for\s*\(\s*const\s+k\s+of\s+PROTECTED_ADMIN_SECTIONS\s*\)\s*out\[k\]\s*=\s*true/);
  });

  it('handleSave يمرّر النسخة المطبّعة إلى sections_visibility', () => {
    const saveBlock = hookSrc.match(/const handleSave[\s\S]*?\n\s{2}\};/)?.[0];
    expect(saveBlock, 'handleSave block must exist').toBeTruthy();
    expect(saveBlock!).toMatch(/normalizeAdminSections\(adminSections\)/);
    expect(saveBlock!).toMatch(
      /updateJsonSetting\(\s*['"]sections_visibility['"]\s*,\s*safeAdminSections\s*\)/,
    );
    // لا تكتب adminSections الخام مباشرة
    expect(saveBlock!).not.toMatch(
      /updateJsonSetting\(\s*['"]sections_visibility['"]\s*,\s*adminSections\s*\)/,
    );
  });

  it('handleReset يطبّع defaultAdminSections أيضاً', () => {
    const resetBlock = hookSrc.match(/const handleReset[\s\S]*?\n\s{2}\};/)?.[0];
    expect(resetBlock, 'handleReset block must exist').toBeTruthy();
    expect(resetBlock!).toMatch(
      /setAdminSections\(\s*normalizeAdminSections\(defaultAdminSections\)\s*\)/,
    );
  });
});
