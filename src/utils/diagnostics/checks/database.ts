/**
 * بطاقة 1 — فحوصات قاعدة البيانات (3)
 */
import { checkDbConnection, getAuthUser, getRealtimeChannels } from '@/lib/services/diagnosticsService';
import type { CheckResult } from '../types';

export async function checkSupabaseConnection(): Promise<CheckResult> {
  const id = 'db_connection';
  try {
    const start = performance.now();
    const { error } = await checkDbConnection();
    const ms = Math.round(performance.now() - start);
    if (error) return { id, label: 'اتصال قاعدة البيانات', status: 'fail', detail: error.message };
    return { id, label: 'اتصال قاعدة البيانات', status: ms > 3000 ? 'warn' : 'pass', detail: `${ms}ms` };
  } catch (e) {
    return { id, label: 'اتصال قاعدة البيانات', status: 'fail', detail: String(e) };
  }
}

export async function checkRealtimeChannels(): Promise<CheckResult> {
  const id = 'db_realtime';
  try {
    const channels = getRealtimeChannels();
    return { id, label: 'قنوات Realtime', status: 'info', detail: `${channels.length} قناة نشطة` };
  } catch {
    return { id, label: 'قنوات Realtime', status: 'warn', detail: 'تعذر الفحص' };
  }
}

export async function checkAuthSession(): Promise<CheckResult> {
  const id = 'db_auth';
  try {
    const { data: { user }, error } = await getAuthUser();
    if (error || !user) return { id, label: 'جلسة المصادقة', status: 'fail', detail: 'غير مسجل الدخول' };
    return { id, label: 'جلسة المصادقة', status: 'pass', detail: 'جلسة نشطة' };
  } catch {
    return { id, label: 'جلسة المصادقة', status: 'fail', detail: 'تعذر التحقق' };
  }
}
