
# تقرير الفحص الجنائي الموسّع — 2026-03-14

> آخر فحص: 2026-03-14 | الإصدار: بعد إصلاح get_pii_key + view grants

---

## 🔴 ثغرة حرجة تم اكتشافها وإصلاحها

### CVE-INT-001 — `get_pii_key` مكشوف لجميع المستخدمين المسجلين
**الخطورة**: حرجة 🔴
**الحالة**: ✅ تم الإصلاح

**المشكلة**: دالة `get_pii_key()` كانت `SECURITY DEFINER` وتتحقق فقط من `auth.uid() IS NULL`. أي مستفيد أو واقف مسجّل يمكنه استدعاء `SELECT public.get_pii_key()` والحصول على مفتاح تشفير AES-256 الخام، مما يُمكّنه من فك تشفير جميع أرقام الهويات والحسابات البنكية.

**الإصلاح**: أُضيف فحص `has_role(auth.uid(), 'admin')` و `has_role(auth.uid(), 'accountant')` — غير ذلك يعيد `NULL`.

### CVE-INT-002 — صلاحيات مفرطة على العروض الآمنة
**الخطورة**: متوسطة 🟠
**الحالة**: ✅ تم الإصلاح

**المشكلة**: `beneficiaries_safe` و `contracts_safe` كان لدى `authenticated` صلاحيات `ALL` (INSERT, UPDATE, DELETE, SELECT). رغم أن العروض لا تسمح عملياً بالكتابة، هذا ينتهك مبدأ أقل صلاحية.

**الإصلاح**: `REVOKE ALL` ثم `GRANT SELECT` فقط لـ `authenticated` و `service_role`.

---

## ✅ حالة الإصلاحات السابقة (مُتحقق منها)

| الإصلاح | الوصف | الحالة |
|---|---|---|
| BUG-05 | `navigate` بدل `window.location.assign` | ✅ |
| BUG-08 | Promise caching في logger | ✅ |
| BUG-09 | `AuthError` type في AuthContext | ✅ |
| BUG-10 | CSP `unsafe-inline` إزالة من script-src | ✅ |
| BUG-11 | `NetworkOnly` لـ Supabase REST/Auth | ✅ |
| NEW-01 | FiscalYearManagementTab → navigate | ✅ |

---

## ✅ فحص الدوال الحساسة — صلاحيات EXECUTE

| الدالة | anon | authenticated | حراس داخلية |
|---|---|---|---|
| `get_pii_key` | ❌ | ✅ | admin/accountant فقط ✅ |
| `decrypt_pii` | ❌ | ✅ | admin/accountant فقط ✅ |
| `encrypt_pii` | ❌ | ✅ | مشغّل فقط (trigger) ✅ |
| `close_fiscal_year` | ❌ | ✅ | — |
| `execute_distribution` | ❌ | ✅ | — |
| `reopen_fiscal_year` | ❌ | ✅ | — |
| `allocate_icv_and_chain` | ❌ | ✅ | — |
| `check_rate_limit` | ✅ (مطلوب) | ✅ | — |
| `log_access_event` | ✅ (مطلوب) | ✅ | — |
| `has_role` | ✅ (مطلوب لـ RLS) | ✅ | — |

---

## ✅ فحص صلاحيات العروض

| العرض | anon | authenticated | service_role |
|---|---|---|---|
| `beneficiaries_safe` | ❌ | SELECT فقط ✅ | ALL |
| `contracts_safe` | ❌ | SELECT فقط ✅ | ALL |

---

## ✅ فحص الأمان العام

- **pgcrypto**: في schema `extensions` ✅
- **RLS**: مفعّل على جميع الجداول الـ 28 ✅
- **audit_log**: محمي من INSERT/UPDATE/DELETE ✅
- **access_log**: محمي من INSERT/UPDATE/DELETE ✅
- **guard-signup**: rate limiting + rollback + email confirm ✅
- **CSP**: `script-src 'self'` بدون `unsafe-inline` ✅
- **PWA**: Supabase API → `NetworkOnly` ✅

## ⚠️ ثغرات devDependencies (خطر مقبول)

| الحزمة | الخطورة | الحكم |
|---|---|---|
| vite-plugin-pwa | عالية | devDependency — لا تُشحن للإنتاج |
| workbox-build | عالية | devDependency |
| serialize-javascript | عالية | devDependency (عبر workbox) |
| @rollup/plugin-terser | عالية | devDependency |

## ✅ فحص `window.location` المتبقية

| الموقع | النوع | الحكم |
|---|---|---|
| `useRealtimeAlerts.ts` | fallback فقط | مقبول (navigate أولاً) |
| `App.tsx` chunk retry | `reload()` | مقصود — لا بديل |
| `main.tsx` PWA update | `reload()` | مقصود |
| `ErrorBoundary.tsx` | `reload()` / `href` | مقصود — error recovery |
| `DashboardLayout.tsx` idle | `href` | مقصود — hard logout |
| `Auth.tsx` signOut | `reload()` | مقصود — حالة استثنائية |

---

**الخلاصة**: تم اكتشاف وإصلاح ثغرة حرجة في `get_pii_key` كانت تسمح لأي مستخدم مسجّل باستخراج مفتاح التشفير. المشروع الآن في حالة أمنية سليمة.
