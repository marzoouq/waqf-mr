

# خطة إصلاح المشاكل الجديدة — ما قبل النشر

## تم التحقق — مشاكل محلولة سابقاً (لن تُعدّل)
| المشكلة | الحالة |
|---------|--------|
| NEW-MED-4: FiscalYearSelector layout shift | **تم** — skeleton موجود (سطر 15-20) |
| NEW-LOW-2: ErrorBoundary hard redirect | **تم** — أُصلح في جولة سابقة |

## الإصلاحات المطلوبة (9 إصلاحات)

### المجموعة 1 — حرجة (4 إصلاحات)

**1. `useAppSettings.ts` سطر 52 — `getJsonSetting` يتعامل مع `"0"` كـ falsy**
- تغيير الشرط من `query.data?.[key] ?` إلى `query.data?.[key] !== undefined && query.data[key] !== null`
- هذا يضمن أن القيم `"0"` و `"false"` و `""` تُعالَج صحيحاً

**2. `useIdleTimeout.ts` سطر 55 — `timeout - warningBefore` قد يكون سالباً**
- إضافة `const safeWarningBefore = Math.min(warningBefore, timeout * 0.5)` في بداية `resetTimer`
- استخدام `safeWarningBefore` بدلاً من `warningBefore` في الحسابات

**3. `InstallApp.tsx` سطر 19 — iPad iOS 13+ غير مكتشف**
- إضافة فحص `navigator.maxTouchPoints > 1` مع `navigator.platform === 'MacIntel'`

**4. `AuthContext.tsx` سطر 210-215 — `nidLockedUntil` لا يُحذف عند signOut**
- إضافة `sessionStorage.removeItem('nidLockedUntil')` في block `finally`

### المجموعة 2 — عالية (4 إصلاحات)

**5. `DashboardLayout.tsx` سطر 357 — المسارات الفرعية تُظهر عنواناً عاماً**
- إنشاء دالة `getRouteTitle(path)` تبحث عن أقرب parent route في `ROUTE_TITLES`

**6. `BottomNav.tsx` — إضافة `aria-hidden="true"` على الأيقونات**
- إضافة `aria-hidden="true"` على `<link.icon>` لأن `span` يحتوي النص المقروء

**7. `BetaBanner.tsx` سطر 36 — `mr-2` بدلاً من `ms-2`**
- استبدال `mr-2` بـ `ms-2` للتوافق مع RTL

**8. `Unauthorized.tsx` — بدون `dir="rtl"`**
- إضافة `dir="rtl"` على الـ wrapper div الرئيسي

### المجموعة 3 — متوسطة (1 إصلاح)

**9. `BetaBanner.tsx` سطر 29 — `sticky` بدلاً من `fixed` للموضع السفلي**
- تغيير `sticky bottom-0` إلى `fixed bottom-0 left-0 right-0` عند `isBottom`

## ملفات لن تُعدّل (مع السبب)
- `AuthContext.tsx` setTimeout race condition — هذا safety net مقصود، والتعليق يوضح ذلك. React 18 لا يُصدر تحذيرات على unmounted setState
- `useWaqfInfo` — تغيير `data` إلى `null` أثناء التحميل سيكسر كل الكود الذي يستخدم `waqfInfo.waqf_name` بدون optional chaining
- `ResetPassword` password strength — تحسين مستقبلي، Supabase يفرض حداً أدنى server-side
- `SecurityGuard` Firefox selectstart — حالة نادرة ولا تؤثر على الأمان الفعلي
- `App.tsx` Suspense — ErrorBoundary موجود فعلاً يغلف التطبيق

