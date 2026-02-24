import { describe, it, expect, vi } from 'vitest';
import { getSafeErrorMessage } from './safeErrorMessage';

describe('getSafeErrorMessage', () => {
  it('returns duplicate message for "already registered"', () => {
    expect(getSafeErrorMessage(new Error('User already registered'))).toBe('هذا البريد الإلكتروني مسجل بالفعل');
  });

  it('returns duplicate message for "duplicate"', () => {
    expect(getSafeErrorMessage('duplicate key violation')).toBe('هذا البريد الإلكتروني مسجل بالفعل');
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
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(getSafeErrorMessage(new Error('some internal pg error xyz'))).toBe('حدث خطأ غير متوقع. يرجى المحاولة لاحقاً');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('handles non-Error objects', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(getSafeErrorMessage(42)).toBe('حدث خطأ غير متوقع. يرجى المحاولة لاحقاً');
    consoleSpy.mockRestore();
  });
});
