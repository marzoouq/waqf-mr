/**
 * فحوصات وضع التدقيق — تتأكد أن وضع ?audit=1 يُعطّل الأنشطة الخلفية كما هو متوقع.
 */
import { isAuditMode } from '@/lib/auditMode';
import { getSwRefusalReason } from '@/lib/pwaBootstrap';
import { collectAuditSignals } from '../collectAuditSignals';
import type { CheckResult } from '../types';

export async function checkAuditModeFlag(): Promise<CheckResult> {
  const id = 'audit_flag';
  const active = isAuditMode();
  return {
    id,
    label: 'علم وضع التدقيق',
    status: 'info',
    detail: active ? 'نشط (?audit=1 أو Lighthouse UA)' : 'غير نشط',
  };
}

export async function checkAuditRealtimeDisabled(): Promise<CheckResult> {
  const id = 'audit_realtime';
  const s = collectAuditSignals();
  if (!s.auditActive) {
    return { id, label: 'تعطيل Realtime في التدقيق', status: 'info', detail: 'الوضع غير نشط' };
  }
  return s.realtime.disabled
    ? { id, label: 'تعطيل Realtime في التدقيق', status: 'pass', detail: s.realtime.reason }
    : { id, label: 'تعطيل Realtime في التدقيق', status: 'fail', detail: 'Realtime لم يُعطّل!' };
}

export async function checkAuditSwBlocked(): Promise<CheckResult> {
  const id = 'audit_sw';
  const reason = getSwRefusalReason();
  if (!isAuditMode()) {
    return { id, label: 'حجب Service Worker في التدقيق', status: 'info', detail: reason ?? 'مسموح' };
  }
  return reason
    ? { id, label: 'حجب Service Worker في التدقيق', status: 'pass', detail: reason }
    : { id, label: 'حجب Service Worker في التدقيق', status: 'fail', detail: 'SW غير محجوب!' };
}

export async function checkAuditQueryClientElevated(): Promise<CheckResult> {
  const id = 'audit_query_client';
  const s = collectAuditSignals();
  if (!s.auditActive) {
    return { id, label: 'رفع staleTime في التدقيق', status: 'info', detail: 'الوضع غير نشط' };
  }
  return s.queryClient.elevated
    ? { id, label: 'رفع staleTime في التدقيق', status: 'pass', detail: `${s.queryClient.staleMinutes} دقيقة` }
    : { id, label: 'رفع staleTime في التدقيق', status: 'fail', detail: 'staleTime لم يُرفع' };
}

export async function checkPdfChunksDeferred(): Promise<CheckResult> {
  const id = 'audit_pdf_chunks';
  const s = collectAuditSignals();
  if (!s.auditActive) return { id, label: 'تأجيل تحميل PDF chunks', status: 'info', detail: 'الوضع غير نشط' };
  if (s.pdfChunks.length === 0) {
    return { id, label: 'تأجيل تحميل PDF chunks', status: 'pass', detail: 'لم تُحمَّل (مؤجَّلة)' };
  }
  const totalKb = s.pdfChunks.reduce((sum, c) => sum + c.sizeKb, 0);
  return { id, label: 'تأجيل تحميل PDF chunks', status: 'warn', detail: `حُمِّلت ${s.pdfChunks.length} chunks (${totalKb}KB)` };
}
