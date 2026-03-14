

# تقرير الفحص الجنائي الشامل — الوضع الحقيقي للمشروع

> تاريخ الفحص: 2026-03-14 | آخر commit ذو صلة: `9f3797f`

---

## القسم الأول: حالة الإصلاحات الخمسة (BUG-05/08/09/10/11)

### ✅ BUG-05 — `window.location.assign` → `navigate`
**مُنفَّذ بشكل صحيح** في `useRealtimeAlerts.ts` (سطر 19, 45, 81). يقبل `navigate?` ويستخدمه مع fallback لـ `window.location.assign`. يُستدعى من `DashboardLayout.tsx` (سطر 176) بـ `useNavigate()` المستقرة مرجعياً.

### ✅ BUG-08 — Promise caching في `logger.ts`
**مُنفَّذ بشكل مثالي** (سطر 10-16). `_logAccessPromise` يُخزَّن ويُعاد استخدامه.

### ✅ BUG-09 — `AuthError` في `AuthContext.tsx`
**مُنفَّذ** (سطر 9, 24-25). النوع `AuthError | Error | null`.

### ✅ BUG-10 — CSP `unsafe-inline`
**مُنفَّذ** — `script-src 'self' https://*.supabase.co` بدون `unsafe-inline`. يبقى في `style-src` فقط (مطلوب لـ Tailwind).

### ✅ BUG-11 — `NetworkOnly` لـ Supabase REST
**مُنفَّذ** (vite.config.ts سطر 60-66). كلا الـ REST و Auth يستخدمان `NetworkOnly`.

---

## القسم الثاني: نقاط متبقية تحتاج انتباه

### ⚠️ NEW-01 — `window.location.assign` في `FiscalYearManagementTab.tsx`
**سطر 131**: `window.location.assign('/dashboard/accounts')` — نفس نمط BUG-05 لم يُعالج في هذا الملف. هذا ليس حرجاً (لا يحدث بتكرار عالٍ) لكنه يكسر الاتساق مع الإصلاح.

**الإصلاح المقترح**: استبدال بـ `useNavigate()` الموجود أصلاً في scope المكون.

### ⚠️ NEW-02 — `window.location.href` في idle logout
**سطر 392 في `DashboardLayout.tsx`**:
```typescript
window.location.href = '/auth?reason=idle';
```
هذا **مقصود** — idle logout يحتاج hard redirect لتنظيف الحالة بالكامل. **مقبول معمارياً**.

### ⚠️ NEW-03 — `window.location.reload()` في أماكن أخرى
- `App.tsx` سطر 29: chunk retry — **مقصود ومقبول** (لا بديل)
- `Auth.tsx` سطر 106: signOut fallback — **مقصود** (حالة استثنائية)
- `ErrorBoundary.tsx` سطر 71, 77: error recovery — **مقصود**
- `main.tsx` سطر 37: PWA update — **مقصود**

جميعها حالات استثنائية حيث hard reload ضروري. **لا تحتاج إصلاح**.

---

## القسم الثالث: فحص أمني شامل

### ✅ المصادقة والتفويض
- **ProtectedRoute**: يتحقق من `role` و `allowedRoles` بشكل صحيح
- **guard-signup**: rate limiting + validation + rollback عند فشل الدور + `email_confirm: false`
- **admin-manage-users**: `getUser()` + admin role check + action whitelist + input validation + self-protection
- لا يوجد anonymous signup
- لا يوجد تخزين أدوار في localStorage

### ✅ CORS
- `cors.ts`: قائمة بيضاء صارمة بأنماط UUID المحدد + نطاقات الإنتاج فقط

### ✅ Error handling
- `safeErrorMessage.ts`: يعقّم رسائل الخطأ التقنية قبل عرضها للمستخدم
- `admin-manage-users`: يعقّم رسائل الخطأ عبر `safeMessages` map

### ✅ Route protection
- جميع `/dashboard/*` محمية بـ `['admin', 'accountant']`
- `/dashboard/users`, `/settings`, `/zatca` محمية بـ `['admin']` فقط
- جميع `/beneficiary/*` محمية بالأدوار المناسبة

### ✅ idle timeout
- يشمل `visibilitychange` handler لمعالجة التبويب المخفي
- safety net مع `firedRef` لمنع التنفيذ المزدوج

### ✅ PWA caching
- Supabase REST/Auth: `NetworkOnly`
- Fonts: `CacheFirst` (مقبول)
- Static assets: `StaleWhileRevalidate` (مقبول)

---

## القسم الرابع: الخلاصة

```text
┌──────────────┬──────────────────────────────────────────┬────────┐
│ الإصلاح      │ الوصف                                    │ الحالة │
├──────────────┼──────────────────────────────────────────┼────────┤
│ BUG-05       │ navigate بدل window.location.assign       │ ✅     │
│ BUG-08       │ Promise caching في logger                │ ✅     │
│ BUG-09       │ AuthError type                           │ ✅     │
│ BUG-10       │ CSP unsafe-inline                        │ ✅     │
│ BUG-11       │ NetworkOnly لـ Supabase                   │ ✅     │
├──────────────┼──────────────────────────────────────────┼────────┤
│ NEW-01       │ FiscalYearManagementTab location.assign   │ ⚠️     │
│ NEW-02       │ idle logout hard redirect                │ مقبول  │
│ NEW-03       │ error/chunk reload                       │ مقبول  │
└──────────────┴──────────────────────────────────────────┴────────┘
```

**النتيجة النهائية**: الإصلاحات الخمسة مُنفَّذة بشكل صحيح. يوجد نقطة واحدة صغيرة (NEW-01) في `FiscalYearManagementTab.tsx` تستخدم `window.location.assign` — ليست حرجة لكنها تكسر الاتساق. يمكن إصلاحها باستبدالها بـ `useNavigate()`.

### الإصلاح المقترح لـ NEW-01
في `src/components/settings/FiscalYearManagementTab.tsx` سطر 131:
- استبدال `window.location.assign('/dashboard/accounts')` بـ `navigate('/dashboard/accounts')`
- التأكد من أن `useNavigate` مستورد ومُستدعى في المكون

