

# إصلاح `logger.ts` — حذف stack trace + تحسينات type safety

## التحليل

من 4 مشاكل مُبلَّغة:

| البند | التقييم |
|-------|---------|
| **مشكلة 1 — stack trace** | **مؤكَّد — يحتاج إصلاح**. يكشف مسارات ملفات المصدر |
| **مشكلة 2 — type safety** | **مؤكَّد — تحسين مفيد**. `string` بدل union type يُضعف الفحص |
| مشكلة 3 — `_logAccessPromise` بعد logout | **ملاحظة تصميمية**. `logAccessEvent` يستخدم Supabase client مشترك — الجلسة تُدار من `AuthContext` لا من الـ logger. سجل بـ `user_id: null` بعد logout مقبول — هو خطأ حصل فعلاً |
| مشكلة 4 — صمت عند فشل import | **مقصود**. Logger لا يجب أن يكسر التطبيق. `catch(() => {})` هو الـ fallback — الخطأ الأصلي طُبع بالفعل في سطر 24 `console.error('[App Error]')` |

## خطة الإصلاح

تعديل ملف واحد `src/lib/logger.ts`:

1. **حذف `stack`** من metadata (سطر 31)
2. **تحسين `LogAccessFn` type** — استيراد النوع الفعلي من `useAccessLog` أو تعريف union type مطابق

