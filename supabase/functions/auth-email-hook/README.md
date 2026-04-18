# auth-email-hook

Hook يُنفَّذ من قِبَل Supabase Auth لإرسال رسائل البريد الإلكتروني الخاصة بالمصادقة (تأكيد التسجيل، إعادة تعيين كلمة المرور، تغيير البريد).

## الغرض
استبدال قوالب البريد الافتراضية بقوالب عربية مخصَّصة لنظام الوقف، مع شعار وتنسيق RTL.

## التفعيل (يدوي — لمرة واحدة)
يجب ربط هذا Hook في لوحة Supabase:

1. **Lovable Cloud** → **Authentication** → **Hooks (Beta)**
2. اختر **Send Email Hook**
3. النوع: **HTTPS**
4. الرابط: `https://<project>.supabase.co/functions/v1/auth-email-hook`
5. Generate **Webhook Secret** وأضفه كـ secret باسم `SEND_EMAIL_HOOK_SECRET`

## الأمان
- `verify_jwt = false` — مقصود لأن Supabase Auth يستدعيها بـwebhook secret منفصل
- التحقق من توقيع `Standard-Webhooks` إلزامي داخل الدالة
- لا تُسجَّل محتويات البريد في السجلات

## الاعتماد
- مزوِّد البريد: Resend (يتطلب `RESEND_API_KEY`)
- نطاق الإرسال يجب أن يكون موثَّقاً في Resend
