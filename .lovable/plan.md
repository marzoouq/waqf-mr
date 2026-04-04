

# خطة إصلاح "callback is no longer runnable" — 3 تغييرات في ملف واحد

## التشخيص المؤكد

بعد فحص `src/contexts/AuthContext.tsx` الحالي، تأكدت المشاكل الثلاث:

| # | المشكلة | السطر | التأثير |
|---|---------|-------|---------|
| 1 | `setTimeout(() => {...}, 0)` يلف كامل منطق `onAuthStateChange` | سطر 97-142 | macrotask يتعارض مع React scheduler → خطأ "callback is no longer runnable" |
| 2 | `await supabase.auth.refreshSession()` داخل `signIn` | سطر 189 | يولّد حدث `TOKEN_REFRESHED` ثانٍ يتسابق مع `SIGNED_IN` → قفل 5000ms |
| 3 | `setLoading(true)` في بداية `signIn` | سطر 179 | يتعارض مع إدارة `loading` في `onAuthStateChange` → وميض UI |

## الإصلاح

**ملف واحد**: `src/contexts/AuthContext.tsx`

### التغيير 1: إزالة `setTimeout(0)` — تنفيذ مباشر بحراسة `isMounted`

إزالة `setTimeout(() => {`, سطر 97) و الإغلاق المقابل (`}, 0);`, سطر 142). المنطق الداخلي يبقى كما هو تماماً لكن يُنفذ مباشرة. Supabase SDK يحرر القفل قبل استدعاء الـ callback فلا حاجة للتأخير.

### التغيير 2: إزالة `refreshSession()` من `signIn`

حذف الأسطر 185-194 (كتلة `if (!jwtRole) { refreshSession }` بالكامل). حدث `SIGNED_IN` يصل عبر `onAuthStateChange` ويفعّل DB fallback إذا لم يكن الدور في JWT. لا حاجة لحدث ثانٍ.

### التغيير 3: إزالة `setLoading(true)` من `signIn`

حذف سطر 179. حالة `loading` تُدار حصرياً عبر `onAuthStateChange`. زر الدخول يستخدم `isLoading` المحلي الخاص به (كما هو موثق في معيار التفاعل).

## النتيجة

- لا macrotasks تتنافس مع React → اختفاء الخطأ
- حدث مصادقة واحد فقط → لا قفل 5000ms
- `loading` في مكان واحد → لا وميض

## ملاحظة أمان

هذا التغيير لا يمس منطق RLS أو الأدوار أو التشفير. فقط يُزيل أنماط async مُسببة لتعارضات.

