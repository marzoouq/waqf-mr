/**
 * اختبار انحدار: ADMIN_SECTION_KEYS و PROTECTED_ADMIN_SECTIONS
 * يضمن أن مفاتيح الأقسام الجديدة (zatca/diagnostics/email_monitor/comparison/settings)
 * موجودة، وأن الأقسام المحمية (settings/users) لا يمكن إخفاؤها.
 */
import { describe, it, expect } from 'vitest';
import {
  ADMIN_SECTION_KEYS,
  PROTECTED_ADMIN_SECTIONS,
  SECTION_LABELS,
  isProtectedAdminSection,
} from '@/constants/sections';

describe('ADMIN_SECTION_KEYS', () => {
  it('يحتوي على المفاتيح الموسّعة بعد إصلاح صلاحيات الإخفاء', () => {
    for (const key of ['settings', 'users', 'zatca', 'diagnostics', 'email_monitor', 'comparison']) {
      expect(ADMIN_SECTION_KEYS).toContain(key);
    }
  });

  it('كل مفتاح له تسمية عربية في SECTION_LABELS', () => {
    for (const key of ADMIN_SECTION_KEYS) {
      expect(SECTION_LABELS[key], `missing label for ${key}`).toBeTruthy();
    }
  });
});

describe('PROTECTED_ADMIN_SECTIONS', () => {
  it('يساوي [settings, users] بالضبط', () => {
    expect([...PROTECTED_ADMIN_SECTIONS].sort()).toEqual(['settings', 'users']);
  });

  it('isProtectedAdminSection يميّز المحمي عن غيره', () => {
    expect(isProtectedAdminSection('settings')).toBe(true);
    expect(isProtectedAdminSection('users')).toBe(true);
    expect(isProtectedAdminSection('expenses')).toBe(false);
    expect(isProtectedAdminSection('invoices')).toBe(false);
  });
});
