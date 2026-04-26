/**
 * validateZatcaForm — تحقّق نقي من حقول إعدادات ZATCA
 *
 * دوال خالصة (pure) — ترجع Result بدون آثار جانبية (لا toast، لا supabase).
 * يستهلكها `useZatcaSettings` ويُترجم النتائج إلى إشعارات في طبقة الهوك.
 *
 * انظر: mem://technical/architecture/lib-vs-utils-boundary
 */
import { SA_VAT_REGEX, IBAN_SA_REGEX, DEVICE_SERIAL_REGEX } from '@/utils/validation/index';

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

/** يتحقق من الرقم الضريبي (15 رقم، يبدأ وينتهي بـ 3). فارغ = صالح. */
export function validateVatNumber(raw: string | undefined): ValidationResult {
  const v = raw?.trim();
  if (!v) return { ok: true };
  if (!SA_VAT_REGEX.test(v)) {
    return { ok: false, reason: 'الرقم الضريبي يجب أن يكون 15 رقماً ويبدأ وينتهي بـ 3' };
  }
  return { ok: true };
}

/** يتحقق من IBAN السعودي (SA + 22 رقم). فارغ = صالح. */
export function validateIbanSa(raw: string | undefined): ValidationResult {
  const v = raw?.trim().replace(/\s/g, '');
  if (!v) return { ok: true };
  if (!IBAN_SA_REGEX.test(v)) {
    return { ok: false, reason: 'صيغة IBAN غير صحيحة (SA + 22 رقم)' };
  }
  return { ok: true };
}

/** يتحقق من معرّف جهاز ZATCA (الصيغة: 1-XXX|2-YYY|3-ZZZ). فارغ = صالح. */
export function validateZatcaDeviceId(raw: string | undefined): ValidationResult {
  const v = raw?.trim();
  if (!v) return { ok: true };
  if (!DEVICE_SERIAL_REGEX.test(v)) {
    return { ok: false, reason: 'صيغة معرّف الجهاز غير صحيحة. الصيغة المطلوبة: 1-XXX|2-YYY|3-ZZZ' };
  }
  return { ok: true };
}

/**
 * يُجري كافة عمليات التحقق على نموذج إعدادات ZATCA.
 * يُرجع أول خطأ يُكتشف، أو ok إن صحّت كلها.
 */
export function validateZatcaSettingsForm(formData: Record<string, string>): ValidationResult {
  const checks = [
    validateVatNumber(formData.vat_registration_number),
    validateIbanSa(formData.waqf_bank_iban),
    validateZatcaDeviceId(formData.zatca_device_serial),
  ];
  const failed = checks.find((r) => !r.ok);
  return failed ?? { ok: true };
}
