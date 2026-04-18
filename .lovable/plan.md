
## خطة الموجة 12 — إصلاح بقات التشخيص الحقيقية

### السياق
بعد فحص جنائي، تأكدت 11+ بق حقيقي في نظام التشخيص. أبرزها شرط رياضي مقلوب يجعل حالة `fail` مستحيلة التنفيذ.

### البق المؤكَّد رياضياً
```typescript
// performance.ts — الفرع الثالث ميت
const status = count > 3000 ? 'warn' : count > 5000 ? 'fail' : 'pass';
```
عند `count = 6000` → ينطبق `>3000` فيُعطي `warn`، والفرع `>5000` لا يُنفَّذ أبداً.

### مصفوفة الإصلاحات

| # | الملف · الفحص | الإصلاح |
|---|---|---|
| 1 | `performance.ts` `checkDomNodesCount` | عكس الشروط: `>5000?'fail':>3000?'warn':'pass'` |
| 2 | `performance.ts` `checkWcagContrast` | حساب فعلي لنسبة التباين (HSL→RGB→luminance→ratio). pass≥4.5، warn≥3، fail<3 |
| 3 | `performance.ts` `checkPagePerformance` | رسالة أوضح: "سيتوفر بعد التنقل بين الصفحات" |
| 4 | `performance.ts` | حذف `checkNavigatorLocks` و `checkWebAssembly` (بلا قيمة) |
| 5 | `database.ts` `checkRealtimeChannels` | 0 قنوات → `info` صريح، >0 → `pass` مع العدد |
| 6 | `storage.ts` `checkErrorLogQueue` | فصل التنظيف: قراءة فقط داخل الفحص (anti-pattern fix) |
| 7 | `ui.ts` `checkCSP` | محاولة `fetch HEAD` لقراءة header، fallback للـ meta |
| 8 | `security.ts` | حذف `checkCryptoAPI` (دائماً pass) و `checkWindowOnError` (دائماً info) |
| 9 | `security.ts` `checkNotificationPermission` | `denied`→`warn`، `default`→`info`، `granted`→`pass` |
| 10 | `zatca.ts` `checkUnsubmittedInvoices` | تشديد: `>0`→`warn`، `>10`→`fail` |
| 11 | `zatca.ts` `checkZatcaCertificateValidity` | تمييز أخطاء الشبكة: `catch`→`info` بدل `fail` كاذب |
| 12 | `appSettings.ts` `checkRegisteredRoutes` | فحص ضد `routeRegistry` للتأكد من وجود component فعلي |

### الملفات المُعدَّلة (7)
- `src/utils/diagnostics/checks/performance.ts`
- `src/utils/diagnostics/checks/database.ts`
- `src/utils/diagnostics/checks/storage.ts`
- `src/utils/diagnostics/checks/ui.ts`
- `src/utils/diagnostics/checks/security.ts`
- `src/utils/diagnostics/checks/zatca.ts`
- `src/utils/diagnostics/checks/appSettings.ts`
- ربما `src/utils/diagnostics/index.ts` (تحديث قائمة الفحوصات بعد الحذف)

### الضمانات
- صفر تغيير في: schema، RLS، Auth، Edge Functions، UI الرئيسية
- التشخيص محصور بـ `ADMIN_ONLY` — لا تأثير على المستخدمين
- 33 → ~30 فحص (حذف 3 بلا قيمة)
- لا migrations، لا تغييرات أمنية

### التحقق بعد التنفيذ
1. `/dashboard/diagnostics` كـ admin
2. تشغيل جميع الفحوصات
3. التأكد من حساب التباين رقمياً (نسبة فعلية)
4. التأكد من تشديد عتبة ZATCA
5. التأكد من اختفاء الفحوصات المحذوفة
