/**
 * أدوات التحقق المشتركة — تُستخدم في جميع نماذج المصادقة والنماذج المالية
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** رقم الهوية الوطنية السعودية — 10 أرقام يبدأ بـ 1 (مواطن) أو 2 (مقيم) */
export const SAUDI_NATIONAL_ID_REGEX = /^[12]\d{9}$/;

/** رقم الجوال السعودي — يبدأ بـ 05 أو 5 متبوعاً بـ 8 أرقام */
export const SAUDI_PHONE_REGEX = /^(05|5)\d{8}$/;

/** الرقم الضريبي السعودي (VAT TIN) — 15 رقماً يبدأ وينتهي بـ 3 */
export const SA_VAT_REGEX = /^3\d{13}3$/;

/** رقم الآيبان السعودي — SA متبوعاً بـ 22 رقماً */
export const IBAN_SA_REGEX = /^SA\d{22}$/;

/** معرّف جهاز ZATCA — الصيغة: 1-XXX|2-YYY|3-ZZZ */
export const DEVICE_SERIAL_REGEX = /^1-.+\|2-.+\|3-.+$/;

/** UUID v4-style identifier (case-insensitive) */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
