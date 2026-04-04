/**
 * التحقق من رقم الهوية الوطنية السعودية — خوارزمية Luhn (Modulo 10)
 * يدعم هويات المواطنين (تبدأ بـ 1) والمقيمين (تبدأ بـ 2)
 */

/**
 * يتحقق من صحة رقم الهوية الوطنية (10 أرقام + Luhn check digit)
 * @returns true إذا كان الرقم صالحاً
 */
export function validateSaudiNationalId(id: string): boolean {
  // يجب أن يكون 10 أرقام تبدأ بـ 1 أو 2
  if (!/^[12]\d{9}$/.test(id)) return false;

  // خوارزمية Luhn
  const digits = id.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = digits[i] ?? 0;
    // مضاعفة الأرقام في المواقع الزوجية (0-indexed)
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/**
 * يتحقق من رقم الهوية مع رسالة خطأ
 * @returns رسالة الخطأ أو null إذا كان صالحاً
 */
export function getNationalIdError(id: string): string | null {
  if (!id) return null; // اختياري
  if (!/^\d+$/.test(id)) return 'رقم الهوية يجب أن يحتوي على أرقام فقط';
  if (id.length !== 10) return 'رقم الهوية يجب أن يكون 10 أرقام';
  if (!/^[12]/.test(id)) return 'رقم الهوية يجب أن يبدأ بـ 1 (مواطن) أو 2 (مقيم)';
  if (!validateSaudiNationalId(id)) return 'رقم الهوية غير صحيح — تحقق من الأرقام';
  return null;
}
