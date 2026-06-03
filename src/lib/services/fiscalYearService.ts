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

export interface FiscalYearInput {
  label: string;
  start_date: string;
  end_date: string;
}

const LABEL_REGEX = /^(\d{4})-(\d{4})$/;
const MAX_DURATION_DAYS = 400;

/**
 * تحقق دلالي pure (بدون استعلامات) — صالح للاختبار.
 * يُرجع رسالة خطأ بالعربية أو null عند الصلاحية.
 */
export const validateFiscalYearInput = (input: FiscalYearInput): string | null => {
  if (!input.label || !input.start_date || !input.end_date) {
    return 'يرجى تعبئة جميع الحقول';
  }
  const m = input.label.match(LABEL_REGEX);
  if (!m) {
    return 'تنسيق المسمى يجب أن يكون YYYY-YYYY (مثال: 2025-2026)';
  }
  const y1 = parseInt(m[1], 10);
  const y2 = parseInt(m[2], 10);
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

  if (rows.some(r => r.label === input.label)) {
    return `يوجد سنة مالية بنفس المسمى "${input.label}"`;
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

export const createFiscalYear = async (data: FiscalYearInput) => {
  const validationError = validateFiscalYearInput(data);
  if (validationError) throw new Error(validationError);

  const conflictError = await checkFiscalYearConflicts(data);
  if (conflictError) throw new Error(conflictError);

  const { error } = await supabase.from('fiscal_years').insert({
    label: data.label,
    start_date: data.start_date,
    end_date: data.end_date,
    status: 'active',
    published: false,
  });
  if (error) throw error;
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
