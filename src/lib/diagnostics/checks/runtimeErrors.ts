/**
 * فحص أخطاء التشغيل — يدمج جامع العميل (runtimeCollector) وسجل السيرفر (access_log/24س).
 */
import { getRuntimeErrors } from '../runtimeCollector';
import { supabase } from '@/integrations/supabase/client';
import type { CheckResult } from '../types';

export async function checkRuntimeErrorsLog(): Promise<CheckResult> {
  const id = 'components_runtime_errors';
  const label = 'سجل أخطاء التشغيل';
  try {
    const client = getRuntimeErrors();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from('access_log')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', 'client_error')
      .gte('created_at', since)
      .not('metadata->>error_message', 'ilike', 'Test %')
      .not('metadata->>message', 'ilike', 'Test %');

    if (error) {
      return { id, label, status: 'warn', detail: `تعذّر قراءة السيرفر: ${error.message}` };
    }
    const server24h = count ?? 0;
    const clientCount = client.length;

    if (clientCount === 0 && server24h === 0) {
      return { id, label, status: 'pass', detail: 'لا أخطاء في العميل أو آخر 24 ساعة على السيرفر' };
    }

    const recent = client.slice(-2).map((e) => e.message).join(' | ');
    const detail = `عميل: ${clientCount} — سيرفر/24س: ${server24h}${recent ? ` — آخر: ${recent}` : ''}`;
    const status: CheckResult['status'] =
      clientCount >= 10 || server24h > 5 ? 'fail' : clientCount > 3 || server24h > 0 ? 'warn' : 'pass';
    return { id, label, status, detail };
  } catch (e) {
    return { id, label, status: 'warn', detail: String(e) };
  }
}
