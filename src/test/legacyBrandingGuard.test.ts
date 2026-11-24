/**
 * حارس الهوية القديمة: صفحات النظام والشعار الاحتياطي لا تعود لأيقونة المبنى أو الاسم العام.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const read = (p: string) => readFileSync(resolve(__dirname, '..', p), 'utf8');

const BRANDED = [
  'pages/NotFound.tsx',
  'pages/Unauthorized.tsx',
  'pages/ResetPassword.tsx',
  'components/auth/AuthBranding.tsx',
  'components/layout/sidebar/SidebarBrand.tsx',
];

describe('legacy branding guard', () => {
  it.each(BRANDED)('%s لا يستخدم أيقونة المبنى كشعار', (p) => {
    expect(read(p)).not.toMatch(/Building2/);
  });

  it.each(['pages/NotFound.tsx', 'pages/Unauthorized.tsx'])('%s لا يعرض الاسم العام القديم', (p) => {
    expect(read(p)).not.toContain('نظام إدارة الوقف</span>');
  });

  it('الشعار الاحتياطي هو /logo.png', () => {
    expect(read('lib/branding/logoFallback.ts')).toContain("LOCAL_LOGO_URL = '/logo.png'");
    expect(read('components/branding/WaqfEmblem.tsx')).toContain('OFFICIAL_LOGO_SRC = LOCAL_LOGO_URL');
  });

  it('/index و /index.html يتحولان للرئيسية', () => {
    const r = read('routes/publicRoutes.tsx');
    expect(r).toMatch(/path="\/index" element={<Navigate to="\/" replace \/>}/);
    expect(r).toMatch(/path="\/index.html" element={<Navigate to="\/" replace \/>}/);
  });
});
