/**
 * Round W — uiPermissionsMatrix: تحقق صارم من audit/ui-permissions-matrix.csv
 *
 * يتأكد أن المصفوفة المُولَّدة (156 صف بيانات + header) متّسقة مع المصادر:
 *   - ROUTE_ROLES يغطي كل الـ routes
 *   - كل route ظاهر بأربعة صفوف (دور لكل)
 *   - effective_allowed=true يحمل access_basis صالح
 *   - whitelist لا يحوي مسارات غير موجودة في ALL_ROUTES
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROUTE_ROLES, EXPECTED_ROUTE_COUNT } from '@/constants/routeRoles';
import { ALL_ROUTES } from '@/constants/routeRegistry';

const CSV_PATH = resolve(process.cwd(), 'audit/ui-permissions-matrix.csv');

const VALID_BASIS = new Set([
  'admin-override', 'role-only', 'role+permission', 'role+section',
  'role+permission+section', 'uncontrolled',
  'denied-role', 'denied-permission', 'denied-section',
]);

const UNCONTROLLED_WHITELIST = new Set([
  '/beneficiary/settings',
  '/dashboard',
  '/beneficiary',
  '/waqif',
]);

function parseCsv(content: string): { header: string[]; rows: string[][] } {
  const lines = content.trim().split('\n');
  const [first, ...rest] = lines;
  return { header: (first ?? '').split(','), rows: rest.map(l => l.split(',')) };
}

describe('Round W — UI Permissions Matrix (audit/ui-permissions-matrix.csv)', () => {
  it('الملف موجود — يُولَّد عبر `node scripts/build-permissions-matrix.mjs`', () => {
    expect(existsSync(CSV_PATH), 'audit/ui-permissions-matrix.csv غير موجود — شغّل build-permissions-matrix.mjs').toBe(true);
  });

  const csv = existsSync(CSV_PATH) ? parseCsv(readFileSync(CSV_PATH, 'utf8')) : { header: [], rows: [] };

  it('header يحتوي الأعمدة الثمانية المطلوبة', () => {
    expect(csv.header).toEqual([
      'route', 'role', 'role_allowed', 'perm_key', 'section_key',
      'effective_allowed', 'access_basis', 'status',
    ]);
  });

  it('عدد صفوف البيانات = 156 (39 مسار × 4 أدوار)', () => {
    expect(csv.rows.length).toBe(156);
  });

  it('ROUTE_ROLES يحتوي 39 مفتاحاً صراحة', () => {
    expect(Object.keys(ROUTE_ROLES)).toHaveLength(EXPECTED_ROUTE_COUNT);
  });

  it('كل مسار في ROUTE_ROLES ظاهر بأربعة صفوف (دور لكل)', () => {
    const counts = new Map<string, number>();
    for (const r of csv.rows) counts.set(r[0], (counts.get(r[0]) || 0) + 1);
    const bad = [...counts.entries()].filter(([, n]) => n !== 4);
    expect(bad, `مسارات بعدد صفوف ≠ 4: ${bad.map(b => `${b[0]}(${b[1]})`).join(', ')}`).toEqual([]);
  });

  it('كل مسار في ROUTE_ROLES موجود في ALL_ROUTES (المسجَّل)', () => {
    const missing = Object.keys(ROUTE_ROLES).filter(r => !(r in ALL_ROUTES));
    expect(missing, `مسارات في ROUTE_ROLES بدون ALL_ROUTES: ${missing.join(', ')}`).toEqual([]);
  });

  it('كل مسار في ALL_ROUTES موجود في ROUTE_ROLES (parity)', () => {
    const missing = Object.keys(ALL_ROUTES).filter(r => !(r in ROUTE_ROLES));
    expect(missing, `مسارات في ALL_ROUTES بدون ROUTE_ROLES: ${missing.join(', ')}`).toEqual([]);
  });

  it('كل access_basis قيمة صالحة', () => {
    const bad = csv.rows.map(r => r[6]).filter(b => !VALID_BASIS.has(b));
    expect([...new Set(bad)], `قيم basis غير صالحة: ${bad.join(', ')}`).toEqual([]);
  });

  it('كل effective_allowed=true له basis إيجابي (وليس denied-*)', () => {
    const bad = csv.rows.filter(r => r[5] === 'true' && r[6].startsWith('denied-'));
    expect(bad.map(b => `${b[0]}/${b[1]}`)).toEqual([]);
  });

  it('كل effective_allowed=false له basis سلبي (denied-*)', () => {
    const bad = csv.rows.filter(r => r[5] === 'false' && !r[6].startsWith('denied-'));
    expect(bad.map(b => `${b[0]}/${b[1]}`)).toEqual([]);
  });

  it('كل صف بـ basis=uncontrolled مسارُه في whitelist', () => {
    const bad = csv.rows
      .filter(r => r[6] === 'uncontrolled')
      .map(r => r[0])
      .filter(route => !UNCONTROLLED_WHITELIST.has(route));
    expect([...new Set(bad)], `مسارات uncontrolled غير موثقة: ${bad.join(', ')}`).toEqual([]);
  });

  it('whitelist لا يحوي مسارات غير موجودة في ALL_ROUTES', () => {
    const phantom = [...UNCONTROLLED_WHITELIST].filter(r => !(r in ALL_ROUTES));
    expect(phantom, `مسارات whitelist غير مسجَّلة: ${phantom.join(', ')}`).toEqual([]);
  });

  it('admin مسموح في كل المسارات (admin-override)', () => {
    const adminRows = csv.rows.filter(r => r[1] === 'admin');
    expect(adminRows).toHaveLength(39);
    const denied = adminRows.filter(r => r[5] !== 'true');
    expect(denied.map(d => d[0])).toEqual([]);
  });
});
