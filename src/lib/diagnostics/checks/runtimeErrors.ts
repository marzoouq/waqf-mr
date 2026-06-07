/**
 * فحص أخطاء التشغيل — يقرأ من جامع runtimeCollector ويبلّغ.
 */
import { getRuntimeErrors } from '../runtimeCollector';
import type { CheckResult } from '../types';

export async function checkRuntimeErrorsLog(): Promise<CheckResult> {
  const id = 'components_runtime_errors';
  try {
    const errors = getRuntimeErrors();
    if (!errors.length) {
      return { id, label: 'سجل أخطاء التشغيل', status: 'pass', detail: 'لا توجد أخطاء مُلتقطة' };
    }
    const recent = errors.slice(-3).map((e) => e.message).join(' | ');
    const status = errors.length >= 10 ? 'fail' : 'warn';
    return { id, label: 'سجل أخطاء التشغيل', status, detail: `${errors.length} خطأ — آخر: ${recent}` };
  } catch (e) {
    return { id, label: 'سجل أخطاء التشغيل', status: 'warn', detail: String(e) };
  }
}
