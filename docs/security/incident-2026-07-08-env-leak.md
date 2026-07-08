# حادثة أمنية — تسرب ملف `.env` إلى المستودع

**التاريخ:** 8 يوليو 2026
**الخطورة:** حرجة (Critical)
**الحالة:** قيد المعالجة — إجراء يدوي مطلوب من المالك

## الجدول التنفيذي

| الحقل | التفاصيل |
|-------|----------|
| **المشكلة** | ملف `.env` متعقَّب في git رغم استثنائه في `.gitignore` وبوابات pre-commit/pre-push |
| **الدليل** | `git ls-files \| grep -x .env` يُرجع `.env`؛ الملف يحتوي `VITE_SUPABASE_URL` و`VITE_SUPABASE_PUBLISHABLE_KEY` و`SUPABASE_URL` و`SUPABASE_PUBLISHABLE_KEY` |
| **التأثير** | مفاتيح publishable/anon مكشوفة في تاريخ Git. لا تسريب لـ `SERVICE_ROLE_KEY`. RLS يحمي البيانات، لكن المفتاح يُمكِّن استعلامات anon محدودة |
| **احتمال الاستغلال** | منخفض-متوسط — anon key عام بطبيعته لكن ظهوره في المستودع يخالف السياسات ويُبطل بوابات الأمن |
| **الإصلاح الفوري** | 1) `git rm --cached .env && git commit -m "chore(security): untrack .env" && git push`<br>2) تدوير مفاتيح Supabase publishable عبر `supabase--rotate_api_keys`<br>3) (اختياري) تنظيف تاريخ Git بـ BFG/filter-repo |
| **الإصلاحات الوقائية المطبَّقة** | ✅ توسيع regex في `ci.yml` + `pre-commit` + `pre-push` لالتقاط `.env` نفسه (سابقاً كان يلتقط `.env.*` فقط) — أي محاولة إعادة إضافة سترفض تلقائياً |
| **المالك** | ناظر الوقف (Admin) |
| **SLA** | إزالة من التتبع: 24 ساعة · تدوير المفاتيح: 24 ساعة · تنظيف التاريخ: 7 أيام (اختياري) |

## سبب الحدوث الجذري

بوابات الحماية السابقة كانت تستخدم regex `^\.env\..+$` الذي يتطلب نقطة+حرف بعد `.env`، فلم يلتقط `.env` نفسه. الملف أُضيف قبل تفعيل البوابات ولم يُكتشف لاحقاً.

## التحقق بعد الإصلاح

```bash
git ls-files | grep -x .env   # يجب أن يعود فارغاً
grep -q "(^|/)\.env(\..+)?$" .github/workflows/ci.yml   # ✅
grep -q "(^|/)\.env(\..+)?$" .husky/pre-commit          # ✅
grep -q "(^|/)\.env(\..+)?$" .husky/pre-push            # ✅
```

## ملاحظات

- المفاتيح publishable/anon مصممة للظهور في bundle العميل — لا يوجد كشف بيانات مباشر.
- `SERVICE_ROLE_KEY` **لم** يكن في `.env` المتسرب.
- Lovable Cloud لا يمنح وصول Supabase Dashboard؛ تدوير المفاتيح يتم عبر أداة `supabase--rotate_api_keys` حصراً.
