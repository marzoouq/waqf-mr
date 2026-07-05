## التشخيص الحالي

- ✅ البناء المحلي ينجح (`npm run build` exit 0، 17.75s).
- ✅ فحص الأمان: لا توجد نتائج حرجة (`findings: []` في كل الفاحصين).
- ✅ `package-lock.json` تم إصلاحه في الجلسة السابقة.
- ✅ Edge Function health-check تعمل (booted 173ms).

**الاستنتاج**: الكود جاهز للنشر. إذا فشل النشر السابق، السبب في منصة النشر لا في الكود.

## خطة الإصلاح

### الخطوة 1 — تحقق من إعدادات النشر
- `publish_settings--get_publish_settings` لمعرفة الرؤية الحالية (public/private) وحالة النشر الأخيرة.
- `project_urls--get_urls` للتأكد من URL الإنتاج المتوقع.

### الخطوة 2 — تحقق من صحة Cloud (production)
- `supabase--cloud_status` environment=production للتأكد أن Live DB في حالة `ACTIVE_HEALTHY` (ليس `INACTIVE`/`PAUSED`/`UNHEALTHY`).

### الخطوة 3 — إعادة النشر
- `preview_ui--publish` مع `website_info_status: already_relevant`.
- إبلاغ المستخدم أن النشر مجدول ويستغرق ~دقيقة قبل الظهور على `https://waqf-wise.net`.

### الخطوة 4 — إذا فشل النشر مجدداً
سأطلب من المستخدم:
- لقطة شاشة لرسالة الفشل الفعلية من واجهة Lovable.
- التحقق من: **Workspace Settings → Privacy & Security** أن النشر ليس مقيّداً بموافقة مسؤول أو "Require security scan before first publish".
- التحقق من إعدادات النطاق المخصص `waqf-wise.net` في Project Settings → Domains (حالة DNS/SSL).

## خارج النطاق
- أي تغيير في كود التطبيق (البناء ناجح والأمان نظيف — لا حاجة).
- تعديل ملفات المصادقة أو RLS أو الأعمال.

هل أنفّذ الخطوات 1→3 الآن؟