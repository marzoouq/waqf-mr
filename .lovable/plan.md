## سبب فشل النشر المُرجَّح

رسالة "Publishing failed due to an internal error" في مشاريع Vite الكلاسيكية غالباً تنتج عن أحد سببين:

1. **مشكلة في بيئة النشر المُدارة** (بيئة Lovable Cloud / Supabase غير مستقرة مؤقتاً) — فحص الحالة الآن يُرجع `SUPABASE_GENERIC_CLIENT_ERROR` مما يشير إلى تذبذب في البنية التحتية.
2. **ملف `.env` غير متعقّب في git** — عندك `.env` موجود محلياً ويحتوي `VITE_SUPABASE_URL/PUBLISHABLE_KEY/PROJECT_ID`، لكن `.gitignore` يستثنيه. الـ build يتم من مصدر git، فتصبح المتغيرات `undefined` عند البناء والنشر يفشل.

القاعدة الأمنية الحالية في CI (`Block tracked .env files`) و`pre-push` (`فحص ملفات .env المتعقّبة`) تمنع أصلاً تعقّب `.env` — وهذا يتعارض مع متطلبات النشر لمشاريع Vite الكلاسيكية (المفاتيح `VITE_*` علنية بطبيعتها، محمية عبر RLS).

## الخطة

### 1. إعادة محاولة النشر أولاً (بدون تعديلات)
- تذبذب Lovable Cloud قد يكون السبب الوحيد. جرّب النشر مجدداً بعد دقائق.
- إن نجح → لا حاجة لأي تغيير.

### 2. إن استمر الفشل: السماح بتعقّب `.env`
تعديلات الملفات (بدون أي تغيير في كود التطبيق):

**`.gitignore`** — استثناء `.env` من الحجب:
```diff
- .env
- .env.*
- !.env.example
+ .env.*
+ !.env.example
+ !.env
```
الملفات `.env.local` و`.env.production` وأي `.env.<x>` تبقى محجوبة (تحمل أسراراً حقيقية عادةً).

**`.github/workflows/ci.yml`** — تخفيف بوابة "Block tracked .env files":
- إزالة حظر `.env` الجذري.
- إبقاء حظر `.env.local` / `.env.production` / `.env.*` (الحقيقية).

**`.husky/pre-push`** — نفس التعديل: السماح بـ `.env` الجذري فقط، ورفض `.env.<variant>`.

**`gitleaks`**: يبقى فعّالاً كخط دفاع ثانٍ — سيرفض أي مفتاح فعلي حساس لو تسرّب.

### 3. تأكيد السلامة الأمنية
- `VITE_SUPABASE_URL` و`VITE_SUPABASE_PUBLISHABLE_KEY` **علنية بالتصميم** (تُشحن في bundle المتصفح، محمية بـ RLS) — موثّق في `<supabase-env-vars-classic>`.
- `SUPABASE_SERVICE_ROLE_KEY` والمفاتيح السرية **ليست** في `.env` (تُدار كأسرار Edge Functions فقط).
- التحقق يدوياً بعد التعديل: `grep -v '^VITE_\|^#\|^$' .env` يجب أن يكون فارغاً.

### 4. Commit + push + نشر
- `git add .env .gitignore .github/workflows/ci.yml .husky/pre-push` ثم commit.
- إعادة محاولة النشر.

## ملاحظة
لن أنفّذ الخطوة 2 قبل تجربة الخطوة 1 لأن التذبذب الحالي في Lovable Cloud قد يكون السبب الوحيد. أخبرني بالنتيجة بعد إعادة المحاولة.
