import { describe, it, expect } from 'vitest';
import { getSafeErrorMessage } from './safeErrorMessage';

describe('getSafeErrorMessage', () => {
  it('returns duplicate message for "already registered"', () => {
    expect(getSafeErrorMessage(new Error('User already registered'))).toBe('هذا البريد الإلكتروني مسجل بالفعل');
  });

  it('returns generic duplicate message for "duplicate"', () => {
    expect(getSafeErrorMessage('duplicate key violation')).toBe('هذا البريد الإلكتروني مسجل بالفعل');
  });

  it('returns contract-specific duplicate message', () => {
    expect(getSafeErrorMessage('duplicate key violation on contract')).toBe('يوجد عقد بنفس البيانات بالفعل');
  });

  it('returns invoice-specific duplicate message', () => {
    expect(getSafeErrorMessage('duplicate invoice number')).toBe('يوجد فاتورة بنفس الرقم بالفعل');
  });

  it('returns property-specific duplicate message', () => {
    expect(getSafeErrorMessage('unique constraint on property')).toBe('يوجد عقار بنفس الرقم بالفعل');
  });

  it('returns duplicate message for "unique"', () => {
    expect(getSafeErrorMessage(new Error('unique constraint'))).toBe('هذا البريد الإلكتروني مسجل بالفعل');
  });

  it('returns invalid login message', () => {
    expect(getSafeErrorMessage(new Error('Invalid login credentials'))).toBe('بيانات تسجيل الدخول غير صحيحة');
  });

  it('returns invalid credentials message', () => {
    expect(getSafeErrorMessage('invalid credentials provided')).toBe('بيانات تسجيل الدخول غير صحيحة');
  });

  it('returns email not confirmed message', () => {
    expect(getSafeErrorMessage(new Error('Email not confirmed'))).toBe('يرجى تأكيد بريدك الإلكتروني أولاً');
  });

  it('returns rate limit message for "rate limit"', () => {
    expect(getSafeErrorMessage(new Error('rate limit exceeded'))).toBe('محاولات كثيرة جداً. يرجى الانتظار قليلاً');
  });

  it('returns rate limit message for "too many"', () => {
    expect(getSafeErrorMessage('too many requests')).toBe('محاولات كثيرة جداً. يرجى الانتظار قليلاً');
  });

  it('returns network error message', () => {
    expect(getSafeErrorMessage(new Error('network error'))).toBe('خطأ في الاتصال بالخادم. تحقق من اتصالك بالإنترنت');
  });

  it('returns fetch error message', () => {
    expect(getSafeErrorMessage(new Error('fetch failed'))).toBe('خطأ في الاتصال بالخادم. تحقق من اتصالك بالإنترنت');
  });

  it('returns not found message', () => {
    expect(getSafeErrorMessage(new Error('Resource not found'))).toBe('البيانات المطلوبة غير موجودة');
  });

  it('returns forbidden message', () => {
    expect(getSafeErrorMessage(new Error('forbidden'))).toBe('ليس لديك صلاحية لتنفيذ هذا الإجراء');
  });

  it('returns unauthorized message', () => {
    expect(getSafeErrorMessage('unauthorized access')).toBe('ليس لديك صلاحية لتنفيذ هذا الإجراء');
  });

  it('returns permission message', () => {
    expect(getSafeErrorMessage(new Error('permission denied'))).toBe('ليس لديك صلاحية لتنفيذ هذا الإجراء');
  });

  it('returns timeout message', () => {
    expect(getSafeErrorMessage(new Error('Request timeout'))).toBe('انتهت مهلة الطلب. يرجى المحاولة لاحقاً');
  });

  it('returns generic message for unknown errors', () => {
    expect(getSafeErrorMessage(new Error('some internal pg error xyz'))).toBe('حدث خطأ غير متوقع. يرجى المحاولة لاحقاً');
  });

  it('handles non-Error objects', () => {
    expect(getSafeErrorMessage(42)).toBe('حدث خطأ غير متوقع. يرجى المحاولة لاحقاً');
  });

  it('returns check constraint message', () => {
    expect(getSafeErrorMessage(new Error('violates check constraint'))).toBe('القيمة المُدخلة غير صالحة. تحقق من البيانات وأعد المحاولة');
  });

  it('returns payload too large message', () => {
    expect(getSafeErrorMessage(new Error('payload too large'))).toBe('حجم البيانات المُرسلة كبير جداً');
  });

  it('returns internal server error message', () => {
    expect(getSafeErrorMessage(new Error('500 internal server error'))).toBe('خطأ في الخادم. يرجى المحاولة لاحقاً أو التواصل مع الدعم');
  });

  it('returns service unavailable message', () => {
    expect(getSafeErrorMessage(new Error('503 service unavailable'))).toBe('الخدمة غير متاحة حالياً. يرجى المحاولة بعد قليل');
  });

  it('returns bad request message', () => {
    expect(getSafeErrorMessage(new Error('400 bad request'))).toBe('البيانات المُرسلة غير صحيحة. يرجى مراجعة الحقول والمحاولة مرة أخرى');
  });

  it('returns OTP expired message', () => {
    expect(getSafeErrorMessage(new Error('otp has expired'))).toBe('انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد');
  });

  it('returns weak password message', () => {
    expect(getSafeErrorMessage(new Error('password is too weak'))).toBe('كلمة المرور ضعيفة أو غير متطابقة. يرجى استخدام كلمة مرور أقوى');
  });

  it('returns storage upload error message', () => {
    expect(getSafeErrorMessage(new Error('upload failed for bucket'))).toBe('فشل رفع الملف. تحقق من الحجم والصيغة وأعد المحاولة');
  });

  it('returns not-null violation message', () => {
    expect(getSafeErrorMessage(new Error('null value in column violates not-null constraint'))).toBe('يوجد حقل مطلوب غير مُعبّأ. يرجى مراجعة النموذج');
  });
});
