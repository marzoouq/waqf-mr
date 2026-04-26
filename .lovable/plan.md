
## التحقق من المتطلبات — النطاق `waqf-wise.net`

### الحالة الحالية في النظام

| المتطلب | الحالة |
|---|---|
| النطاق المخصص متصل | ✅ `https://waqf-wise.net` نشط |
| النطاق الفرعي للبريد | ✅ `notify.waqf-wise.net` موثَّق (Verified) |
| تفويض NS لـ Lovable | ✅ `ns3/ns4.lovable.cloud` فعّال |
| المشروع منشور | ✅ Public |
| مراجع الكود | ✅ كل الملفات (`index.html`, `sitemap.xml`, `robots.txt`, `cors.ts`) تستخدم `waqf-wise.net` بالفعل |
| البنية التحتية للبريد | ✅ مكتملة (queue + cron + tables) من المهمة السابقة |

**النتيجة:** كل المتطلبات التقنية جاهزة. ما تبقى هو خطوتان فقط بناءً على اختيارك (Primary + Email).

---

## الخطوات

### 1) تثبيت `waqf-wise.net` كنطاق أساسي (Primary)
- تأكيد أن `waqf-wise.net` هو الـ Primary في **Project Settings → Domains** ليُعاد توجيه `waqf-wise-net.lovable.app` إليه تلقائياً.
- تحديث `supabase/functions/auth-email-hook/index.ts`: تغيير ثابت `SAMPLE_PROJECT_URL` من `https://waqf-wise-net.lovable.app` إلى `https://waqf-wise.net` (الرابط الذي يظهر داخل بريد المصادقة كصفحة سقوط احتياطية).
- إبقاء `https://waqf-wise-net.lovable.app` ضمن قائمة CORS المسموح بها كـ fallback (لا يضرّ، يدعم زوّار الرابط القديم).

### 2) تفعيل قوالب البريد على نطاقك (waqf-wise.net)
- توليد قوالب المصادقة المُخصَّصة (`scaffold_auth_email_templates`) بحيث تُرسل من `noreply@waqf-wise.net` عبر `notify.waqf-wise.net`.
- تطبيق هوية الوقف على القوالب: لون `--primary` (أخضر/ذهبي)، خط Tajawal، شعار الوقف من `waqf-assets`.
- إعادة نشر `auth-email-hook`.
- النتيجة: كل رسائل المصادقة (تسجيل، استعادة كلمة مرور، magic link، تأكيد بريد، 2FA، تأكيد تغيير بريد) ستصدر باسم الوقف من نطاقه.

### 3) تحقق نهائي
- اختبار اشتراك جديد + استعادة كلمة مرور للتأكد من وصول البريد من `@waqf-wise.net`.
- مراقبة لوحة "مراقبة البريد الإلكتروني" (`/dashboard/email-monitor`) للتأكد من 0 DLQ.
- فتح `https://waqf-wise.net` في متصفح خاص للتأكد من توجيه HTTPS وعدم وجود تحذيرات.

---

## ملاحظات تقنية

- لن أُعدّل `src/integrations/supabase/client.ts` ولا `supabase/config.toml` ولا `.env` (محمية).
- لن أُعدّل ملفات المصادقة (`AuthContext`, `ProtectedRoute`).
- التغيير في `auth-email-hook` يقتصر على ثابت واحد + إعادة نشر — لا تغيير في المنطق الأمني.
- لن يُمسّ `waqf-wise-net.lovable.app` كـ origin مسموح به في CORS لتجنّب كسر أي إشارة قديمة.

---

## ما الذي ستحصل عليه

- روابط رسمية واحدة: `https://waqf-wise.net` لكل المستخدمين.
- بريد مصادقة باسم الوقف من `noreply@waqf-wise.net` بدلاً من القوالب الافتراضية.
- اتساق كامل في الـ canonical, sitemap, الروابط في القوالب.
