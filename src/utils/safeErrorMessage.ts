import { logger } from '@/lib/logger';

/**
 * يحوّل رسائل الخطأ التقنية إلى رسائل آمنة للمستخدم
 * بدون كشف تفاصيل قاعدة البيانات أو البنية الداخلية
 */
export function getSafeErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (msg.includes('already registered') || msg.includes('duplicate') || msg.includes('unique')) {
    return 'هذا البريد الإلكتروني مسجل بالفعل';
  }
  if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
    return 'بيانات تسجيل الدخول غير صحيحة';
  }
  if (msg.includes('email not confirmed')) {
    return 'يرجى تأكيد بريدك الإلكتروني أولاً';
  }
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'محاولات كثيرة جداً. يرجى الانتظار قليلاً';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'خطأ في الاتصال بالخادم. تحقق من اتصالك بالإنترنت';
  }
  if (msg.includes('not found') || msg.includes('pgrst116')) {
    return 'البيانات المطلوبة غير موجودة';
  }
  if (msg.includes('forbidden') || msg.includes('unauthorized') || msg.includes('permission')
    || msg.includes('row-level security') || msg.includes('rls')) {
    return 'ليس لديك صلاحية لتنفيذ هذا الإجراء';
  }
  if (msg.includes('jwt expired') || msg.includes('invalid jwt') || msg.includes('pgrst301')) {
    return 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
  }
  if (msg.includes('timeout')) {
    return 'انتهت مهلة الطلب. يرجى المحاولة لاحقاً';
  }
  if (msg.includes('foreign key') || msg.includes('violates foreign key')) {
    return 'لا يمكن حذف هذا العنصر لارتباطه ببيانات أخرى';
  }

  // رسالة افتراضية آمنة — التفاصيل تبقى في logger فقط
  logger.error('[App Error]', error);
  return 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً';
}
