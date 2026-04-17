

# خطة التنفيذ — تنظيف معماري شامل + تحقق من الآثار الجانبية

## السياق

المستخدم وافق على الخطوات الست للتنظيف المعماري، وأضاف طلباً مهماً:
> **"تحقق من عمل الطباعة وتبديل القوالب وإشعارات التحديث بعد استبدال `window.print` و `localStorage`"**

هذا الطلب يشير إلى الالتزام بمعايير v7 (استخدام `usePrint` و `safeStorage` بدلاً من الاستدعاء المباشر). سأضيف **خطوة 7: تدقيق وتحقق** بعد التنظيف.

## الخطوات 1-6 (كما تم الاتفاق سابقاً)

| # | الخطوة | الملفات |
|---|--------|---------|
| 1 | نقل `pages/beneficiary/carryforward/` و `notifications/` → `components/` | 9 |
| 2 | دمج `useGreeting` داخل `useBeneficiaryDashboardPage` | 2 |
| 3 | فصل `AuditLogHelpers.tsx` → `utils/format/auditLabels.ts` + `components/audit/DataDiff.tsx` | 5 |
| 4 | نقل `tabItems` من `useBeneficiarySettingsPage` إلى الصفحة | 2 |
| 5 | استخراج `useInstallAppPage` hook | 2 |
| 6 | إنشاء `src/types/zatca.ts` لتوحيد `ComplianceResult` | 3 |

## الخطوة 7 (جديدة) — تدقيق `window.print` و `localStorage` المباشر

سأبحث في الكود الإنتاجي عن:

### أ. `window.print` المباشر
- يجب أن يستخدم كل الكود `usePrint` من `@/hooks/ui/usePrint` (معيار v7)
- إذا وُجد استخدام مباشر → استبداله بـ `usePrint`
- التحقق من زر الطباعة في:
  - تقارير المستفيد (PDF reports)
  - فواتير ZATCA
  - أي صفحة تطبع

### ب. `localStorage` / `sessionStorage` المباشر
- يجب أن يستخدم كل الكود `safeStorage` من `@/lib/storage` (معيار v7)
- المواضع الحرجة المتوقعة:
  - **تبديل القوالب** (theme toggle) — `localStorage.setItem('theme', ...)`
  - **إشعارات التحديث** (notification preferences) — `NOTIF_PREFS_KEY`, `NOTIFICATION_TONE_KEY`, `NOTIFICATION_VOLUME_KEY`
  - **PWA install dismissal**
- إذا وُجد استخدام مباشر → استبداله بـ `safeStorage`

### ج. تحقق وظيفي بعد التغييرات
- تشغيل `npm test` للتأكد من الاختبارات
- فحص يدوي مقترح في رسالة الإنجاز:
  - زر الطباعة في صفحة تقرير
  - تبديل المظهر (light/dark)
  - حفظ تفضيلات الإشعارات وإعادة تحميل الصفحة

## ترتيب التنفيذ

```text
الخطوات 1→6 (تنظيف معماري) 
       ↓
الخطوة 7 (بحث + استبدال window.print/localStorage إن وُجد)
       ↓
تشغيل tsc --noEmit + npm test
       ↓
تقرير نهائي بقائمة الملفات المُعدّلة + توصيات اختبار يدوي
```

## ضمانات

- **صفر تغيير سلوكي**: كل الاستبدالات (usePrint, safeStorage) تحافظ على نفس الواجهة الخارجية
- **ملفات محمية**: لن أمس `AuthContext`, `ProtectedRoute`, `client.ts`, `types.ts`, `config.toml`, `.env`
- **اختبارات SignupForm**: ستبقى تعمل (لا تغيير في `useFieldErrors`)
- **التحقق النهائي**: `npx tsc --noEmit` + تشغيل اختبارات الوحدة

## الملفات المتوقع تأثرها

- 23 ملف من الخطوات 1-6
- + 0-5 ملفات إضافية من الخطوة 7 (حسب نتيجة البحث)
- **الإجمالي المتوقع**: 23-28 ملف

