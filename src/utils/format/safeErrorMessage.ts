

/**
 * يحوّل رسائل الخطأ التقنية إلى رسائل آمنة للمستخدم
 * بدون كشف تفاصيل قاعدة البيانات أو البنية الداخلية
 */
export function getSafeErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  // تكرار بيانات (duplicate key / unique constraint)
  if (msg.includes('already registered') || msg.includes('duplicate') || msg.includes('unique')) {
    // #80: التمييز بين أنواع التكرار
    if (msg.includes('contract') || msg.includes('عقد')) return 'يوجد عقد بنفس البيانات بالفعل';
    if (msg.includes('invoice') || msg.includes('فاتورة')) return 'يوجد فاتورة بنفس الرقم بالفعل';
    if (msg.includes('property') || msg.includes('عقار')) return 'يوجد عقار بنفس الرقم بالفعل';
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
  // #81: أخطاء check constraint
  if (msg.includes('check constraint') || msg.includes('violates check')) {
    return 'القيمة المُدخلة غير صالحة. تحقق من البيانات وأعد المحاولة';
  }
  // حجم البيانات
  if (msg.includes('payload too large') || msg.includes('too large') || msg.includes('413')) {
    return 'حجم البيانات المُرسلة كبير جداً';
  }
  // خطأ خادم عام
  if (msg.includes('500') || msg.includes('internal server')) {
    return 'خطأ في الخادم. يرجى المحاولة لاحقاً أو التواصل مع الدعم';
  }
  // خطأ صيانة / عدم توفر الخدمة
  if (msg.includes('503') || msg.includes('service unavailable') || msg.includes('maintenance')) {
    return 'الخدمة غير متاحة حالياً. يرجى المحاولة بعد قليل';
  }
  // طلب غير صحيح
  if (msg.includes('400') || msg.includes('bad request') || msg.includes('invalid input') || msg.includes('malformed')) {
    return 'البيانات المُرسلة غير صحيحة. يرجى مراجعة الحقول والمحاولة مرة أخرى';
  }
  // انتهاء صلاحية OTP أو رمز التحقق
  if (msg.includes('otp') || msg.includes('expired') || msg.includes('verification')) {
    return 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد';
  }
  // عدم تطابق كلمة المرور أو ضعفها
  if (msg.includes('password') && (msg.includes('weak') || msg.includes('short') || msg.includes('mismatch'))) {
    return 'كلمة المرور ضعيفة أو غير متطابقة. يرجى استخدام كلمة مرور أقوى';
  }
  // تخزين الملفات
  if (msg.includes('storage') || msg.includes('bucket') || msg.includes('upload failed')) {
    return 'فشل رفع الملف. تحقق من الحجم والصيغة وأعد المحاولة';
  }
  // حقل مطلوب مفقود (not-null violation)
  if (msg.includes('not-null') || msg.includes('null value') || msg.includes('violates not-null')) {
    return 'يوجد حقل مطلوب غير مُعبّأ. يرجى مراجعة النموذج';
  }

  // رسالة افتراضية آمنة — التفاصيل تبقى في logger فقط
  logger.error('[App Error]', error);
  return 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً';
}
