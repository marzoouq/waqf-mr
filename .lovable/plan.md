

# خطة الإكمال — التحقق الجنائي النهائي

## ما تم إنجازه (الخطوات 1-7)
✅ نقل المكونات، دمج useGreeting، فصل AuditLogHelpers، تنظيف Settings hook، استخراج useInstallAppPage، توحيد ZATCA types، استبدال localStorage بـ safeStorage.

## ما تبقى — التحقق الجنائي (Forensic Verification)

### المرحلة أ: فحص الاستيرادات اليتيمة
بحث شامل عن أي import لا يزال يشير إلى المسارات القديمة المحذوفة:
- `pages/beneficiary/carryforward/*` 
- `pages/beneficiary/notifications/*` (المكونات المنقولة)
- `components/audit/AuditLogHelpers`

### المرحلة ب: فحص `window.print` المباشر
بحث في `src/**/*.{ts,tsx}` (باستثناء `usePrint.ts` نفسه) عن أي استدعاء مباشر لـ `window.print()` واستبداله بـ `usePrint`.

### المرحلة ج: فحص `localStorage`/`sessionStorage` المتبقي
بحث شامل عن أي استدعاء مباشر متبقي لـ:
- `localStorage.getItem/setItem/removeItem`
- `sessionStorage.*`

استثناءات مقبولة: `src/lib/storage.ts` نفسه، ملفات الاختبار (`*.test.*`).

### المرحلة د: التحقق من سلامة الملفات المنقولة
- التأكد من وجود `index.ts` صحيح في `src/components/carryforward/` و `src/components/notifications/`
- التحقق من أن `useInstallAppPage` مُستخدم فعلياً في `InstallApp.tsx`
- التحقق من أن `BeneficiaryDashboard.tsx` يستخدم `greetingData` من Page Hook

### المرحلة هـ: فحص TypeScript + الاختبارات
- `npx tsc --noEmit` للتحقق من خلو الكود من أخطاء النوع
- `npm test` للتأكد من نجاح كل الاختبارات (خصوصاً `SignupForm.test.tsx`)

### المرحلة و: تقرير جنائي نهائي
جدول يحتوي على:
| الفحص | الحالة | الملفات المتأثرة |
|-------|--------|------------------|
| استيرادات يتيمة | ✅/❌ | ... |
| window.print مباشر | ✅/❌ | ... |
| localStorage مباشر | ✅/❌ | ... |
| TypeScript | ✅/❌ | ... |
| Unit Tests | ✅/❌ | ... |

+ توصيات اختبار يدوي:
1. فتح صفحة تقرير → ضغط زر طباعة → التأكد من ظهور إشعار "جاري تجهيز الطباعة..."
2. تبديل الثيم (light/dark) → إعادة تحميل → التأكد من بقاء الاختيار
3. تعديل تفضيلات الإشعارات → إعادة تحميل → التأكد من بقاء الإعدادات
4. فتح لوحة المستفيد → التأكد من ظهور التحية بشكل طبيعي
5. فتح صفحة تثبيت التطبيق → التأكد من زر التثبيت يعمل

## ضمانات
- **قراءة فقط حتى الموافقة** — لن أعدّل أي ملف في هذه الجولة قبل الموافقة
- إذا اكتُشف استدعاء `window.print` أو `localStorage` مباشر → سأطلب الموافقة على استبدالها قبل التنفيذ
- صفر تغيير سلوكي

