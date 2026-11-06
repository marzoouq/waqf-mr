import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { runDeepClean } from '@/lib/diagnostics/deepClean';
import { STORAGE_KEYS } from '@/constants/storageKeys';

const migSql = readdirSync('drizzle/migrations')
  .filter((f) => f.includes('clear_client_error_logs'))
  .map((f) => readFileSync(join('drizzle/migrations', f), 'utf8'))
  .join('\n');

describe('مسح الكاش وسجل الأخطاء', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it('يحفظ الجلسة وتفضيلات الجهاز ويمسح سجلات التشخيص', async () => {
    localStorage.setItem('sb-x-auth-token', 's');
    localStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, '1');
    localStorage.setItem(STORAGE_KEYS.NOTIFICATION_SOUND, '1');
    localStorage.setItem(STORAGE_KEYS.FISCAL_YEAR, 'fy');
    sessionStorage.setItem('fiscal_year_id', 'fy');
    localStorage.setItem('error_log_queue', '[]');
    localStorage.setItem('diagnostics_history', '[]');
    await runDeepClean();
    expect(localStorage.getItem('sb-x-auth-token')).toBe('s');
    expect(localStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED)).toBe('1');
    expect(localStorage.getItem(STORAGE_KEYS.NOTIFICATION_SOUND)).toBe('1');
    expect(localStorage.getItem(STORAGE_KEYS.FISCAL_YEAR)).toBe('fy');
    expect(sessionStorage.getItem('fiscal_year_id')).toBe('fy');
    expect(localStorage.getItem('error_log_queue')).toBeNull();
    expect(localStorage.getItem('diagnostics_history')).toBeNull();
  });

  it('الدالة الخادمية للناظر فقط', () => {
    expect(migSql).toMatch(/has_role\(v_uid, 'admin'::app_role\)/);
    expect(migSql).toMatch(/REVOKE ALL ON FUNCTION public\.clear_client_error_logs\(\) FROM PUBLIC, anon/);
  });

  it('لا تحذف إلا أخطاء الواجهة ولا تمس سجل المراجعة أو الجداول المالية', () => {
    const deletes = migSql.match(/DELETE FROM [\w.]+[^;]*/g) ?? [];
    expect(deletes).toEqual(["DELETE FROM public.access_log WHERE event_type = 'client_error'"]);
    expect(migSql).not.toMatch(/(DELETE FROM|UPDATE|TRUNCATE)\s+public\.(audit_log|issued_documents|income|expenses|distributions|payment_invoices|accounts)/);
  });
});
