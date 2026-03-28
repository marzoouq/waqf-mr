/**
 * بطاقة 7 — فحوصات ZATCA والفوترة الإلكترونية (7)
 */
import { supabase } from '@/integrations/supabase/client';
import type { CheckResult } from '../types';

export async function checkZatcaCertificateValidity(): Promise<CheckResult> {
  const id = 'zatca_cert';
  try {
    const { data, error } = await supabase
      .from('zatca_certificates')
      .select('certificate_type, is_active, expires_at')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (error) return { id, label: 'شهادة ZATCA', status: 'fail', detail: `خطأ: ${error.message}` };
    if (!data) return { id, label: 'شهادة ZATCA', status: 'warn', detail: 'لا توجد شهادة نشطة — يجب إجراء عملية الربط (Onboard)' };

    const certType = data.certificate_type || 'غير محدد';
    if (!data.expires_at) {
      return { id, label: 'شهادة ZATCA', status: 'info', detail: `نوع: ${certType} — تاريخ الانتهاء غير محدد` };
    }

    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) {
      return { id, label: 'شهادة ZATCA', status: 'fail', detail: `نوع: ${certType} — منتهية منذ ${Math.abs(daysLeft)} يوم! يجب التجديد فوراً` };
    }
    if (daysLeft <= 14) {
      return { id, label: 'شهادة ZATCA', status: 'warn', detail: `نوع: ${certType} — تنتهي خلال ${daysLeft} يوم — يُنصح بالتجديد` };
    }
    return { id, label: 'شهادة ZATCA', status: 'pass', detail: `نوع: ${certType} — صالحة لمدة ${daysLeft} يوم` };
  } catch {
    return { id, label: 'شهادة ZATCA', status: 'fail', detail: 'تعذر الفحص — قد لا تملك صلاحية الوصول' };
  }
}

export async function checkInvoiceChainIntegrity(): Promise<CheckResult> {
  const id = 'zatca_chain';
  try {
    const { data: chainRecords, error } = await supabase
      .from('invoice_chain')
      .select('icv, invoice_hash, previous_hash')
      .neq('invoice_hash', 'PENDING')
      .order('icv', { ascending: true })
      .limit(500);

    if (error) return { id, label: 'تكامل سلسلة الفواتير', status: 'fail', detail: `خطأ: ${error.message}` };
    if (!chainRecords || chainRecords.length === 0) {
      return { id, label: 'تكامل سلسلة الفواتير', status: 'info', detail: 'لا توجد سجلات في السلسلة بعد' };
    }

    let brokenLinks = 0;
    let icvGaps = 0;
    for (let i = 1; i < chainRecords.length; i++) {
      const prev = chainRecords[i - 1]!;
      const curr = chainRecords[i]!;
      if (curr.previous_hash !== prev.invoice_hash) brokenLinks++;
      if (curr.icv !== prev.icv + 1) icvGaps++;
    }

    const total = chainRecords.length;
    if (brokenLinks > 0) {
      return { id, label: 'تكامل سلسلة الفواتير', status: 'fail', detail: `${total} سجل — ${brokenLinks} رابط مكسور في سلسلة PIH!` };
    }
    if (icvGaps > 0) {
      return { id, label: 'تكامل سلسلة الفواتير', status: 'warn', detail: `${total} سجل — ${icvGaps} فجوة في تسلسل ICV` };
    }
    return { id, label: 'تكامل سلسلة الفواتير', status: 'pass', detail: `${total} سجل — السلسلة متكاملة (ICV ${chainRecords[0]?.icv ?? '?'}–${chainRecords[total - 1]?.icv ?? '?'})` };
  } catch {
    return { id, label: 'تكامل سلسلة الفواتير', status: 'fail', detail: 'تعذر الفحص' };
  }
}

export async function checkPendingInvoiceChains(): Promise<CheckResult> {
  const id = 'zatca_pending';
  try {
    const { count, error } = await supabase
      .from('invoice_chain')
      .select('id', { count: 'exact', head: true })
      .eq('invoice_hash', 'PENDING');

    if (error) return { id, label: 'سجلات PENDING في السلسلة', status: 'fail', detail: `خطأ: ${error.message}` };
    const pendingCount = count ?? 0;
    if (pendingCount > 0) {
      return { id, label: 'سجلات PENDING في السلسلة', status: 'warn', detail: `${pendingCount} سجل بحالة PENDING — قد تحتاج تنظيف` };
    }
    return { id, label: 'سجلات PENDING في السلسلة', status: 'pass', detail: 'لا توجد سجلات معلّقة' };
  } catch {
    return { id, label: 'سجلات PENDING في السلسلة', status: 'info', detail: 'تعذر الفحص' };
  }
}

export async function checkUnsubmittedInvoices(): Promise<CheckResult> {
  const id = 'zatca_unsubmitted';
  try {
    const { count, error } = await supabase
      .from('payment_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'paid')
      .eq('zatca_status', 'not_submitted');

    if (error) return { id, label: 'فواتير مدفوعة غير مُبلّغة', status: 'fail', detail: `خطأ: ${error.message}` };
    const unsubCount = count ?? 0;
    if (unsubCount > 10) {
      return { id, label: 'فواتير مدفوعة غير مُبلّغة', status: 'warn', detail: `${unsubCount} فاتورة مدفوعة لم تُبلّغ لـ ZATCA` };
    }
    if (unsubCount > 0) {
      return { id, label: 'فواتير مدفوعة غير مُبلّغة', status: 'info', detail: `${unsubCount} فاتورة بانتظار التبليغ` };
    }
    return { id, label: 'فواتير مدفوعة غير مُبلّغة', status: 'pass', detail: 'كل الفواتير المدفوعة مُبلّغة' };
  } catch {
    return { id, label: 'فواتير مدفوعة غير مُبلّغة', status: 'info', detail: 'تعذر الفحص' };
  }
}

export async function checkZatcaSettings(): Promise<CheckResult> {
  const id = 'zatca_settings';
  try {
    const requiredKeys = ['vat_registration_number', 'waqf_name', 'commercial_registration_number'];
    const { data, error } = await supabase
      .from('app_settings')
      .select('key')
      .in('key', requiredKeys);

    if (error) return { id, label: 'إعدادات ZATCA الأساسية', status: 'fail', detail: `خطأ: ${error.message}` };
    const foundKeys = (data || []).map(r => r.key);
    const missing = requiredKeys.filter(k => !foundKeys.includes(k));

    if (missing.length > 0) {
      const labels: Record<string, string> = {
        vat_registration_number: 'الرقم الضريبي',
        waqf_name: 'اسم الوقف',
        commercial_registration_number: 'السجل التجاري',
      };
      return { id, label: 'إعدادات ZATCA الأساسية', status: 'fail', detail: `مفقودة: ${missing.map(k => labels[k] || k).join('، ')}` };
    }
    return { id, label: 'إعدادات ZATCA الأساسية', status: 'pass', detail: 'الرقم الضريبي + اسم الوقف + السجل التجاري — موجودة' };
  } catch {
    return { id, label: 'إعدادات ZATCA الأساسية', status: 'info', detail: 'تعذر الفحص' };
  }
}

export async function checkStaleOtp(): Promise<CheckResult> {
  const id = 'stale_otp';
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key')
      .in('key', ['zatca_otp_1', 'zatca_otp_2']);

    if (error) return { id, label: 'OTP متبقٍ في الإعدادات', status: 'info', detail: `تعذر الفحص: ${error.message}` };

    if (data && data.length > 0) {
      const keys = data.map(r => r.key).join('، ');
      return { id, label: 'OTP متبقٍ في الإعدادات', status: 'warn', detail: `وُجد ${data.length} مفتاح OTP لم يُحذف: ${keys} — قد يشير لعملية onboard/renew لم تكتمل` };
    }
    return { id, label: 'OTP متبقٍ في الإعدادات', status: 'pass', detail: 'لا يوجد OTP متبقٍ — سليم' };
  } catch {
    return { id, label: 'OTP متبقٍ في الإعدادات', status: 'info', detail: 'تعذر الفحص' };
  }
}

export async function checkInvoiceChainCompleteness(): Promise<CheckResult> {
  const id = 'invoice_chain_completeness';
  try {
    const [invoicesRes, chainRes] = await Promise.all([
      supabase.from('payment_invoices').select('id', { count: 'exact', head: true }).not('icv', 'is', null),
      supabase.from('invoice_chain').select('id', { count: 'exact', head: true }).eq('source_table', 'payment_invoices'),
    ]);

    if (invoicesRes.error || chainRes.error) {
      return { id, label: 'تطابق الفواتير مع السلسلة', status: 'info', detail: 'تعذر الفحص' };
    }

    const invoiceCount = invoicesRes.count ?? 0;
    const chainCount = chainRes.count ?? 0;
    const diff = invoiceCount - chainCount;

    if (diff > 0) {
      return { id, label: 'تطابق الفواتير مع السلسلة', status: 'warn', detail: `${diff} فاتورة لها ICV لكن بدون سجل في invoice_chain (فواتير: ${invoiceCount}، سلسلة: ${chainCount})` };
    }
    if (diff < 0) {
      return { id, label: 'تطابق الفواتير مع السلسلة', status: 'warn', detail: `سجلات السلسلة أكثر من الفواتير بـ ${Math.abs(diff)} (فواتير: ${invoiceCount}، سلسلة: ${chainCount})` };
    }
    return { id, label: 'تطابق الفواتير مع السلسلة', status: 'pass', detail: `متطابق — ${invoiceCount} فاتورة و${chainCount} سجل` };
  } catch {
    return { id, label: 'تطابق الفواتير مع السلسلة', status: 'info', detail: 'تعذر الفحص' };
  }
}
