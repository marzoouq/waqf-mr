# الموجة 2 — التوجيه والمصادقة والصلاحيات (RBAC)

**التاريخ**: 2026-06-15 — **النوع**: قراءة فقط (تشخيص) — **النطاق**: Router + AuthContext + ProtectedRoute + RequirePermission + WebAuthn + Session/Idle + RBAC matrix.

---

## 1) نطاق الفحص

| المحور | الملفات |
|---|---|
| **الموجّه** | `src/app/router.tsx`, `src/routes/{admin,beneficiary,waqif,public}Routes.tsx`, `ProtectedRouteHelper.tsx`, `withRouteErrorBoundary.tsx` |
| **الحراس** | `src/components/auth/{ProtectedRoute,RequirePermission,SecurityGuard}.tsx` |
| **السياق** | `src/contexts/AuthContext.tsx`, `src/hooks/auth/session/{useAuthListener,useAuthContext,useAuthCleanup,useSessionExpiry,useFiscalYearPersistence}.ts` |
| **التدفّقات** | `src/hooks/auth/flows/{useLoginForm,useResetPassword,usePasswordResetRequest,useChangePassword,useAccessLogger,useFieldErrors}.ts` |
| **البيومتري** | `src/hooks/auth/biometric/useWebAuthn*.ts` + `supabase/functions/webauthn/` |
| **الأدوار/التوجيه** | `src/hooks/auth/role/useRoleRedirect.ts`, `src/constants/{roles,navigation,routeRegistry,routeRoles}.ts` |
| **Edge** | `supabase/functions/guard-signup/` |
| **الصلاحيات** | `src/hooks/application/usePermissionCheck.ts` + `src/components/layout/IdleTimeoutManager.tsx` |

**42 مسار** موزّعة: 24 admin/accountant + 16 beneficiary/waqif + 1 waqif + 7 عامة.

---

## 2) النتائج المرتبة بالخطورة

### 🔴 Critical — 0

لا توجد ثغرات حرجة. الطبقات متعددة (`ProtectedRoute` → `RequirePermission` → RLS) صحيحة معمارياً.

---

### 🟠 High — 6

#### W2-001 — فقدان `?from=` بعد تسجيل الدخول (Deep-link Loss)
- **الموقع**: `src/components/auth/ProtectedRoute.tsx:65` → `useRoleRedirect.ts:21-30` + `useLandingPage.ts:55-62`
- **الوصف**: `ProtectedRoute` يُمرّر `?from=<intended-path>` إلى `/auth`، لكن `useRoleRedirect` يتجاهل المعامل ويُعيد التوجيه دائماً إلى Root الدور (`/dashboard` أو `/beneficiary` أو `/waqif`). أي مستخدم يصل عبر رابط عميق (مثل `/dashboard/invoices/123`) يفقد قصده بعد الدخول.
- **الأثر**: تجربة سيئة، نقر إضافي، روابط مشاركة مكسورة.
- **التوصية**: في `useRoleRedirect` اقرأ `searchParams.get('from')` وافتحه إذا تطابق صلاحيته مع الدور؛ وإلا fallback للجذر.

#### W2-002 — `RequirePermission` يسمح بالعرض عندما `role === null` (Permissive Fail-Open)
- **الموقع**: `src/components/auth/RequirePermission.tsx:33` (`if (!role) return <>{children}</>;`)
- **الوصف**: قاعدة المشروع fail-closed، لكن هذا الفرع يعرض المحتوى أثناء جلب الدور — يعتمد ضمنياً على أن `ProtectedRoute` الأب أوقف التحميل. صحيح اليوم، لكنه هش: لو غُلِّفت صفحة بـ `RequirePermission` بدون `ProtectedRoute` (مثلاً في مكوّن frame داخلي) لانكشف المحتوى.
- **التوصية**: إرجاع loader (نفس Loader في `ProtectedRoute`) أو دمج الحارسَين في مكوّن واحد.

#### W2-003 — `useAuthListener` يُسجّل `role_fetch` مرتين عند JWT صالح
- **الموقع**: `src/hooks/auth/session/useAuthListener.ts:117-122` + الـ `getUser fallback` السطر 152-160
- **الوصف**: إذا فاتت `INITIAL_SESSION` ثم نجح fallback، يُمكن أن يُكتب `access_log` event_type='role_fetch' مرتين لنفس الجلسة. ضوضاء في سجل المراجعة.
- **التوصية**: استخدم `loggedSessionIdRef` لإلغاء التكرار.

#### W2-004 — `useLandingPage` و `useRoleRedirect` يكرّران نفس منطق التوجيه
- **الموقع**: `src/hooks/application/useLandingPage.ts:55-62` ↔ `src/hooks/auth/role/useRoleRedirect.ts:21-30`
- **الوصف**: دالتان مستقلتان تُنتجان نفس التوجيه (`admin/accountant→/dashboard`, `waqif→/waqif`, `beneficiary→/beneficiary`). أي تعديل لاحق (مثلاً إضافة دور أو مسار افتراضي) يجب أن يتم في موقعين.
- **التوصية**: استخراج خريطة `ROLE_HOME: Record<AppRole, string>` في `constants/roles.ts` واستهلاكها من الموقعين.

#### W2-005 — `Auth.tsx` يفقد تبويب `signup` بعد إعادة التحميل
- **الموقع**: `src/pages/Auth.tsx:99` (`<Tabs defaultValue="signin">`)
- **الوصف**: لا يقرأ `?tab=signup` ولا يتذكّر آخر تبويب. مستخدم في منتصف التسجيل يفقد سياقه عند أي refresh أو navigate back.
- **التوصية**: ربط الـ tab بـ URL search param.

#### W2-006 — لا CAPTCHA على `guard-signup` (Email Enumeration Risk)
- **الموقع**: `supabase/functions/guard-signup/index.ts`
- **الوصف**: حماية موجودة عبر `check_rate_limit` (5/دقيقة/IP) لكن لا CAPTCHA. عبر بروكسي دوّار يمكن enumerate الإيميلات لمعرفة المسجّل/غير المسجّل من رسائل خطأ Supabase.
- **التوصية**: إضافة Turnstile/hCaptcha، أو على الأقل تطبيع رسائل خطأ "موجود/غير موجود".

---

### 🟡 Medium — 8

#### W2-007 — `ACCOUNTANT_EXCLUDED_ROUTES` يحتوي مسارات `ADMIN_ONLY` (تكرار حماية)
- **الموقع**: `src/constants/navigation.ts:176`
- **الوصف**: 8 من 9 عناصر في القائمة محمية أصلاً بـ `pr(ADMIN_ONLY, ...)` في الموجّه. الزائد فقط `/beneficiary`. القائمة لا تضرّ لكنها مصدر حقيقة مزدوج يُسهّل drift مستقبلاً.
- **التوصية**: اشتقاق القائمة من `ROUTE_ROLES`: `Object.entries(ROUTE_ROLES).filter(([,r]) => !r.includes('accountant')).map(([p]) => p)`.

#### W2-008 — `EXPECTED_ROUTE_COUNT = 41` لكن تعريفات `ROUTE_ROLES` = 41 و `adminRoutes.tsx` = 25
- **الموقع**: `src/constants/routeRoles.ts:73`
- **الوصف**: عدّ المسارات في `ROUTE_ROLES` = 16 + 8 + 16 + 1 = 41 ✓، وفي `adminRoutes.tsx` 25 سطر `Route` (16 admin/accountant + 8 admin only = 24 admin، + 1 آخر). تطابق صحيح لكن التعليق "22 مسار admin" داخل الملف قديم — التعداد الحقيقي 24. مخاطر سوء فهم للمراجعين.
- **التوصية**: تحديث التعليق فقط.

#### W2-009 — `IdleTimeoutManager` غير مركَّب في صفحات beneficiary خارج `DashboardLayout`
- **الموقع**: `src/components/layout/DashboardLayout.tsx:171`
- **الوصف**: المُدير مرتبط بـ `DashboardLayout`. تأكد أن كل صفحات `/beneficiary/*` و `/waqif` تستخدم نفس Layout — إذا كانت تستخدم `BeneficiaryLayout` منفصل بدون IdleTimeoutManager فلا يوجد timeout على جلسات beneficiary/waqif.
- **التوصية**: نقل `IdleTimeoutManager` إلى `RootLayout` بشرط `if (!user) return null;` داخله.

#### W2-010 — `SecurityGuard` مُحمَّل lazy على كل المسارات بما فيها العامة
- **الموقع**: `src/app/root-layout.tsx:14, 54-56`
- **الوصف**: HTML العامة (Privacy/Terms/Install) لا تحتوي `[data-sensitive]`. تحميله إضاعة chunk صغير + listener.
- **التوصية**: نقله إلى `DashboardLayout` و `BeneficiaryLayout` فقط.

#### W2-011 — `useFiscalYearPersistence` لا يربط الـ key بـ `user.id`
- **الموقع**: `src/hooks/auth/session/useFiscalYearPersistence.ts:18`
- **الوصف**: `sessionStorage` مُشترك بين tabs/profiles على نفس الجهاز. لو تبدّل المستخدم (login جديد بـ tab أخرى) يبقى الـ id القديم حتى يُعاد التحقق.
- **التوصية**: مفتاح ديناميكي `fiscal_year:${user.id}` أو مسحه في `useAuthCleanup`.

#### W2-012 — `useRoleRedirect` يتجاهل `accountant` في فرع navigation ولكن يتعامل معه ضمن `admin`
- **الموقع**: `useRoleRedirect.ts:24`
- **الوصف**: صحيح لكنه يجعل قراءة الشيفرة موحية بأن accountant = admin (تأثير الـ OR). محاسب يصل لـ `/dashboard` تماماً كالناظر، ثم `RequirePermission` يحجب المسارات الفرعية. واضح للقارئ المُجرَّب فقط.
- **التوصية**: تعليق توضيحي.

#### W2-013 — `Auth.tsx` لا يُغلق الجلسة عند فشل `roleWaitTimeout` تلقائياً
- **الموقع**: `src/pages/Auth.tsx:30-35`
- **الوصف**: يُعرض زر "تسجيل الخروج" يدوياً عند مرور `ROLE_RESOLUTION_TIMEOUT_MS`. لكن الجلسة تبقى نشطة في الخلفية تستهلك RLS calls.
- **التوصية**: `signOut()` تلقائي بعد timeout مع toast إخباري.

#### W2-014 — `withRouteErrorBoundary` يلف الصفحات لكن لا يُطبَّق على `/auth` داخل `Suspense`
- **الموقع**: `src/routes/publicRoutes.tsx:19`
- **الوصف**: `eb(<Suspense><Auth/></Suspense>)` — ErrorBoundary خارج Suspense. خطأ في تحميل chunk الـ Auth يقع داخل Suspense وقد لا يصل ErrorBoundary بشكل متّسق.
- **التوصية**: `<Suspense fallback=...><eb(<Auth/>)></Suspense>`.

---

### 🔵 Low — 5

| رقم | البند | الموقع |
|---|---|---|
| W2-015 | `VALID_ROLES` مكرّر في `useAuthListener` بدل `ALL_ROLES` من `constants/roles` | `useAuthListener.ts:23` |
| W2-016 | `RequirePermission` يستدعي `uiNotify.error` عند كل deny — لا rate-limit للـ toast إذا تنقّل المستخدم بسرعة | `RequirePermission.tsx:25` |
| W2-017 | `Auth.tsx` تحوي 4 `<Suspense>` متداخلة بدون fallback موحّد للهوية البصرية | `Auth.tsx` |
| W2-018 | `ProtectedRoute` يستخدم `<Loader2>` بدلاً من `<PageLoader>` المعرّف في `common/` | `ProtectedRoute.tsx:64,77` |
| W2-019 | `useLandingPage` يُجرّب `window` بدلاً من `import.meta.env.SSR` guard موحّد | `useLandingPage.ts:60` |

---

### ⚪ Info — 4 (نقاط قوة)

- ✅ **مصدر حقيقة موحَّد**: `routeRegistry.ts` + `routeRoles.ts` + `roles.ts` → استبعاد drift بين Sidebar/Router/Permissions.
- ✅ **JWT-first**: قراءة الدور من `app_metadata.user_role` فوراً، fallback DB only — لا انتظار غير ضروري.
- ✅ **fail-closed افتراضي** في `usePermissionCheck`: `return false` للدور غير المعروف.
- ✅ **Edge `guard-signup`** يستخدم Zod + `check_rate_limit` DB-backed + fail-closed على فشل التحقق.

---

## 3) مصفوفة RBAC الكاملة (sample — 12 من 41)

| المسار | admin | accountant | beneficiary | waqif | الحارس |
|---|---|---|---|---|---|
| `/dashboard` | ✅ | ✅ | 🚫→`/unauthorized` | 🚫 | Protected+RequirePerm |
| `/dashboard/users` | ✅ | 🚫 | 🚫 | 🚫 | Protected (admin only) |
| `/dashboard/income` | ✅ | ✅ | 🚫 | 🚫 | Protected+RequirePerm |
| `/dashboard/audit-log` | ✅ | ✅ | 🚫 | 🚫 | Protected+RequirePerm |
| `/dashboard/zatca` | ✅ | 🚫 | 🚫 | 🚫 | Protected (admin only) |
| `/beneficiary` | ✅ | 🚫 (ACCOUNTANT_EXCLUDED) | ✅ | 🚫 | Protected+RequirePerm |
| `/beneficiary/financial-reports` | ✅ | 🚫 | ✅ | ✅ | Protected+RequirePerm |
| `/beneficiary/my-share` | ✅ | 🚫 | ✅ | 🚫 | Protected+RequirePerm |
| `/waqif` | ✅ | 🚫 | 🚫 | ✅ | Protected (no perm) |
| `/auth` | 🌐 | 🌐 | 🌐 | 🌐 | عام |
| `/reset-password` | 🌐 | 🌐 | 🌐 | 🌐 | عام |
| `/unauthorized` | 🌐 | 🌐 | 🌐 | 🌐 | عام |

> الجدول الكامل (41 صف) في `matrices/rbac-full.csv` (سيُولَّد آلياً من `ROUTE_ROLES` في موجة 3).

---

## 4) المُلخّص التنفيذي

- **0 Critical** — البنية متينة، لا ثغرة تتيح كسر RBAC.
- **6 High** — كلها UX/Defense-in-Depth: deep-link loss، fail-open شرطي، CAPTCHA مفقود، fiscal year per-user، تكرار منطق.
- **8 Medium** + **5 Low** — تنظيف وتوحيد ومصدر حقيقة.
- **0 ثغرة DB** في هذه الموجة — مخصّصة للموجة 6.

أبرز ما يستحق إصلاحاً فورياً (إذا قرّرت لاحقاً): **W2-001** (deep-link)، **W2-002** (fail-open)، **W2-011** (fiscal year per-user)، **W2-009** (تحقّق Idle لـ beneficiary).
