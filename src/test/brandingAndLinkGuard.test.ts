import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const mig = (name: string) => {
  const f = readdirSync('drizzle/migrations').find((x) => x.includes(name));
  return f ? readFileSync(join('drizzle/migrations', f), 'utf8') : '';
};

describe('الشعار للزوار وطلب ربط الحساب', () => {
  it('الزائر يقرأ اسم الوقف والشعارين فقط', () => {
    const sql = mig('public_branding_settings');
    const keys = [...sql.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]).sort();
    expect(keys).toEqual(['landing_logo_url', 'waqf_logo_url', 'waqf_name']);
    expect(sql).toMatch(/TO anon/);
  });

  it('توجد نسخة محلية من الشعار وتستعملها صفحتا الهبوط والدخول عند الفشل', () => {
    expect(existsSync('public/logo.png')).toBe(true);
    for (const f of ['src/components/auth/AuthBranding.tsx', 'src/components/landing/LandingHero.tsx']) {
      expect(readFileSync(f, 'utf8')).toContain('onError={handleLogoError}');
    }
  });

  it('طلب الربط للمسجّلين فقط ومحدود بمرة كل 24 ساعة', () => {
    const sql = mig('request_account_link');
    expect(sql).toMatch(/FROM PUBLIC, anon/);
    expect(sql).toMatch(/interval '24 hours'/);
  });

  it('لوحة الناظر لا تنتظر الملخص قبل تحميل الفواتير والعقود', () => {
    const src = readFileSync('src/hooks/page/admin/dashboard/useAdminDashboardPage.ts', 'utf8');
    expect(src).not.toMatch(/!summary\.isLoading && !summary\.isError/);
  });
});
