/**
 * خدمة العمليات على السنوات المالية
 *
 * يتضمن تحققاً دلالياً صارماً قبل الإنشاء:
 *  - تنسيق label = YYYY-YYYY بفارق سنة واحدة بالضبط
 *  - start_date < end_date والمدة ≤ 400 يوم
 *  - عدم التداخل الزمني مع سنوات أخرى
 *  - عدم تكرار label
 *  - عدم وجود سنة active أخرى (سنة نشطة واحدة فقط)
 */
import { supabase } from '@/integrations/supabase/client';
import { rpc } from '@/lib/api/rpc';
import { normalizeArabicDigits } from '@/utils/format/normalizeDigits';

export interface FiscalYearInput {
  label: string;
  start_date: string;
  end_date: string;
}

const LABEL_REGEX = /^(\d{4})-(\d{4})$/;
const MAX_DURATION_DAYS = 400;

/** يطبّع label: يحوّل الأرقام العربية/الفارسية إلى لاتينية ويزيل المسافات */
export const normalizeFiscalYearLabel = (label: string): string =>
  normalizeArabicDigits(String(label ?? '')).trim();

/**
 * تحقق دلالي pure (بدون استعلامات) — صالح للاختبار.
 * يُرجع رسالة خطأ بالعربية أو null عند الصلاحية.
 */
export const validateFiscalYearInput = (input: FiscalYearInput): string | null => {
  if (!input.label || !input.start_date || !input.end_date) {
    return 'يرجى تعبئة جميع الحقول';
  }
  const normalizedLabel = normalizeFiscalYearLabel(input.label);
  const m = normalizedLabel.match(LABEL_REGEX);
  if (!m) {
    return 'تنسيق المسمى يجب أن يكون YYYY-YYYY (مثال: 2025-2026)';
  }
  const y1 = parseInt(m[1] ?? '0', 10);
  const y2 = parseInt(m[2] ?? '0', 10);
  if (y2 - y1 !== 1) {
    return 'السنة الثانية في المسمى يجب أن تكون أكبر من الأولى بسنة واحدة بالضبط';
  }
  const start = new Date(input.start_date);
  const end = new Date(input.end_date);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'تواريخ غير صالحة';
  }
  if (start >= end) {
    return 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية';
  }
  const durationDays = (end.getTime() - start.getTime()) / 86_400_000;
  if (durationDays > MAX_DURATION_DAYS) {
    return `مدة السنة المالية تتجاوز الحد المسموح (${MAX_DURATION_DAYS} يوم)`;
  }
  return null;
};

/**
 * يفحص قاعدة البيانات للتأكد من:
 *  - عدم تكرار label
 *  - عدم وجود تداخل زمني مع سنة أخرى
 *  - عدم وجود سنة active أخرى (لأن السنة الجديدة تُنشأ active افتراضياً)
 * يُرجع رسالة خطأ أو null.
 */
export const checkFiscalYearConflicts = async (input: FiscalYearInput): Promise<string | null> => {
  const { data, error } = await supabase
    .from('fiscal_years')
    .select('id, label, start_date, end_date, status')
    .limit(200);
  if (error) throw error;
  const rows = data ?? [];
  const normalizedLabel = normalizeFiscalYearLabel(input.label);

  if (rows.some(r => r.label === normalizedLabel)) {
    return `يوجد سنة مالية بنفس المسمى "${normalizedLabel}"`;
  }
  const overlap = rows.find(r =>
    r.start_date <= input.end_date && r.end_date >= input.start_date,
  );
  if (overlap) {
    return `يوجد تداخل زمني مع السنة "${overlap.label}" (${overlap.start_date} → ${overlap.end_date})`;
  }
  const otherActive = rows.find(r => r.status === 'active');
  if (otherActive) {
    return `يوجد سنة نشطة بالفعل: "${otherActive.label}". أقفلها أو اجعلها غير نشطة قبل إنشاء سنة جديدة.`;
  }
  return null;
};

/**
 * يبحث في DB عن السنة المتعارضة زمنياً مع المدخل (استعلام مباشر بدلاً من scan في JS).
 * يُستخدم لإثراء رسالة خطأ 23P01 بالاسم والفترة الفعلية للسنة المتعارضة.
 */
const findOverlappingYear = async (
  input: FiscalYearInput,
): Promise<{ label: string; start_date: string; end_date: string } | null> => {
  const { data, error } = await supabase
    .from('fiscal_years')
    .select('label, start_date, end_date')
    .lte('start_date', input.end_date)
    .gte('end_date', input.start_date)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data ?? null;
};

/** يحوّل أخطاء Postgres إلى رسائل عربية حرفية مفهومة */
const mapPostgresError = async (err: unknown, input: FiscalYearInput): Promise<string> => {
  const e = err as { code?: string; message?: string };
  const label = normalizeFiscalYearLabel(input.label);
  if (e?.code === '23P01') {
    // EXCLUDE constraint — استعلم عن السنة المتعارضة لرسالة دقيقة
    const overlap = await findOverlappingYear(input);
    return overlap
      ? `يوجد تداخل زمني مع السنة "${overlap.label}" (${overlap.start_date} → ${overlap.end_date})`
      : 'يوجد تداخل زمني مع سنة مالية أخرى';
  }
  if (e?.code === '23505') {
    const msg = String(e.message ?? '');
    if (msg.includes('fiscal_years_one_active_idx')) {
      return 'يوجد سنة نشطة بالفعل. أقفلها قبل إنشاء سنة جديدة.';
    }
    if (msg.includes('fiscal_years_label_unique') || msg.includes('label')) {
      return `يوجد سنة مالية بنفس المسمى "${label}"`;
    }
    return 'قيمة مكررة تنتهك قيداً فريداً في جدول السنوات المالية';
  }
  if (e?.code === '23514') {
    return 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية';
  }
  return e?.message ?? 'حدث خطأ أثناء إنشاء السنة المالية';
};

export const createFiscalYear = async (data: FiscalYearInput) => {
  const normalizedLabel = normalizeFiscalYearLabel(data.label);
  const payload: FiscalYearInput = { ...data, label: normalizedLabel };

  const validationError = validateFiscalYearInput(payload);
  if (validationError) throw new Error(validationError);

  const conflictError = await checkFiscalYearConflicts(payload);
  if (conflictError) throw new Error(conflictError);

  const { error } = await supabase.from('fiscal_years').insert({
    label: payload.label,
    start_date: payload.start_date,
    end_date: payload.end_date,
    status: 'active',
    published: false,
  });
  if (error) throw new Error(await mapPostgresError(error, payload));
};


export const reopenFiscalYear = async (fiscalYearId: string, reason: string) => {
  return await rpc<{ label: string }>('reopen_fiscal_year', {
    p_fiscal_year_id: fiscalYearId,
    p_reason: reason,
  });
};

export const toggleFiscalYearPublished = async (fiscalYearId: string, published: boolean) => {
  const { error } = await supabase.from('fiscal_years').update({ published }).eq('id', fiscalYearId);
  if (error) throw error;
};

export const deleteFiscalYear = async (fiscalYearId: string) => {
  const { error } = await supabase.from('fiscal_years').delete().eq('id', fiscalYearId);
  if (error) throw error;
};

/**
 * حذف شامل للسنة المالية وكل بياناتها المرتبطة (للناظر فقط).
 * يستدعي دالة قاعدة بيانات آمنة تتحقق من دور الأدمن قبل التنفيذ.
 */
export const deleteFiscalYearCascade = async (fiscalYearId: string) => {
  return await rpc<{ success: boolean; label: string; deleted: Record<string, number> }>(
    'delete_fiscal_year_cascade',
    { p_fiscal_year_id: fiscalYearId },
  );
};

export const fetchActiveFiscalYear = async () => {
  const { data, error } = await supabase
    .from('fiscal_years')
    .select('id')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
};
