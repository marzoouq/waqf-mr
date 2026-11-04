import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ROUTE_ROLES } from '@/constants/routeRoles';

const mig = readFileSync('drizzle/migrations/0020_audit_tree_and_official_letters.sql', 'utf8');

describe('شجرة التدقيق والوثائق المعتمدة — حارس', () => {
  it('شجرة التدقيق للناظر والمحاسب فقط', () => {
    expect(ROUTE_ROLES['/dashboard/audit-tree']).toEqual(['admin', 'accountant']);
    expect(mig).toMatch(/audit_reconciliation[\s\S]*has_role\(auth\.uid\(\), 'admin'::app_role\) OR public\.has_role\(auth\.uid\(\), 'accountant'::app_role\)/);
  });
  it('الوثائق المعتمدة للناظر فقط', () => {
    expect(ROUTE_ROLES['/dashboard/official-letters']).toEqual(['admin']);
    expect(mig).toMatch(/admin_insert_official_letters[\s\S]*has_role\(auth\.uid\(\), 'admin'::app_role\)/);
    expect(mig).not.toMatch(/official_letters TO anon/);
  });
  it('إلغاء الوثيقة ينعكس في صفحة التحقق', () => {
    expect(mig).toMatch(/UPDATE issued_documents SET status = 'void'/);
  });
});
