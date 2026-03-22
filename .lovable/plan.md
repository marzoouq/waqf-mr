

# فحص جنائي هجين إضافي — مراجعة شاملة نهائية

---

## المنهجية

فحص المناطق التي لم تُغطَّ بعمق في الجولات السابقة (20-23): Edge Functions الأمنية، صفحة المصادقة، الواقف (Waqif) route/sidebar تناسق، أنماط TypeScript العميقة (`as never`), صفحات قانونية، CORS hardening، ونمط console.log في الإنتاج.

---

## النتائج

### ✅ بنود سليمة (تم التحقق المباشر من الكود)

| البند | التفصيل |
|-------|---------|
| **Edge Functions — Auth validation** | جميع الـ 12 Edge Function تستخدم `getUser()` أو `timingSafeEqual` (service role) — لا يوجد اعتماد على JWT فقط |
| **CORS — تقييد صارم** | `cors.ts` يقيد الأصول بـ 3 نطاقات ثابتة + regex خاص بمعرف المشروع فقط — لا wildcards |
| **guard-signup — Rollback** | عند فشل تعيين الدور، يُحذف المستخدم فوراً لمنع الحسابات اليتيمة |
| **admin-manage-users — Self-protection** | `set_role` و `delete_user` يمنعان الناظر من تعديل/حذف نفسه |
| **admin-manage-users — Input validation** | Email, Password, UUID, Role, NationalId — كلها مع validators + whitelist للأفعال |
| **lookup-national-id — Anti-enumeration** | Fixed delay + progressive delay + unified response (found=true حتى عند عدم الوجود) |
| **ai-assistant — Rate limiting** | 30 طلب/دقيقة لكل مستخدم + message truncation (10 رسائل × 2000 حرف) |
| **Auth.tsx — Role redirect** | 4 أدوار مع مسارات صحيحة: admin/accountant→dashboard, beneficiary→beneficiary, waqif→waqif |
| **Auth.tsx — Role timeout** | 5 ثوانٍ انتظار ثم "لم يتم التعرف على صلاحياتك" مع زر خروج |
| **ResetPassword — PKCE support** | يدعم 3 طرق: `PASSWORD_RECOVERY` event, URL hash, query params |
| **console.log في الإنتاج** | محصور في `logger.ts` (DEV only) + `FiscalYearContext` (DEV only) — لا تسريب في الإنتاج |
| **dangerouslySetInnerHTML** | موضعان فقط: JSON-LD ثابت + chart styles — آمنان |
| **`@ts-ignore`** | موضع واحد فقط: `arabic-reshaper` بلا types — مبرر |
| **`as any`** | موضع واحد فعلي: `navigator.deviceMemory` — مبرر. الباقي تعليقات توثيقية |
| **الصفحات القانونية** | `PrivacyPolicy.tsx` + `TermsOfUse.tsx` — محتوى عربي كامل ومناسب |
| **ACCOUNTANT_EXCLUDED_ROUTES** | 5 مسارات: users, settings, zatca, diagnostics, beneficiary — مطابق للإصلاح السابق |
| **Waqif sidebar filtering** | `disclosure: false, share: false, support: false` يمنع ظهور الإفصاح وحصتي والدعم — سليم |
| **Waqif home redirect** | `link.to === '/beneficiary'` يُستبدل بـ `/waqif` — سليم |

---

### 🟡 F-01: `as never` منتشر في useCrudFactory و useAnnualReport (منخفضة)

**الملفات:** `useCrudFactory.ts` (3 مواضع), `useAnnualReport.ts` (3 مواضع)

**المشكلة:** `as never` يتجاوز فحص TypeScript بالكامل. إذا تغير schema الجدول مستقبلاً، لن تظهر أخطاء compilation. هذا نمط أقل أماناً من `as Parameters<...>[0]`.

**تحليل المخاطر:** منخفضة — `useCrudFactory` هو generic factory يتعامل مع أنواع ديناميكية حيث `as never` مبرر لأن TypeScript لا يستطيع التحقق من الأنواع في runtime generics. `useAnnualReport` يمكن تحسينه لكن الجداول مستقرة.

**القرار:** ✅ مقبول — تحسين تجميلي لا يؤثر على الأمان أو الوظائف.

---

### 🟡 F-02: check-contract-expiry — يسجل userEmail في console (منخفضة)

**الملف:** `admin-manage-users/index.ts` سطر 161, 194

```typescript
console.log("updateUserById success for user:", userId);
console.log("Password verify login SUCCESS for:", userEmail);
```

**المشكلة:** يسجل `userId` و `userEmail` في سجلات Edge Function. هذه بيانات قد تظهر في Cloud Logs.

**تحليل المخاطر:** منخفضة — السجلات محصورة بنطاق Edge Function ولا يصل إليها إلا الناظر عبر لوحة التحكم. لكنها ممارسة غير مثالية.

**الإصلاح المقترح:** استبدال بـ `console.log("updateUserById success")` بدون تفاصيل المستخدم.

---

### ✅ F-03: Waqif route access — متناسق

تم فحص كل مسارات `/beneficiary/*` المتاحة للواقف:

| المسار | allowedRoles | Waqif perms | sidebar يظهر؟ | متناسق؟ |
|--------|:---:|:---:|:---:|:---:|
| `/waqif` | admin, waqif | — | ✅ (redirected) | ✅ |
| `/beneficiary/properties` | admin, beneficiary, waqif | properties: true | ✅ | ✅ |
| `/beneficiary/contracts` | admin, beneficiary, waqif | contracts: true | ✅ | ✅ |
| `/beneficiary/disclosure` | admin, beneficiary | disclosure: false | ❌ مخفي | ✅ |
| `/beneficiary/my-share` | admin, beneficiary | share: false | ❌ مخفي | ✅ |
| `/beneficiary/financial-reports` | admin, beneficiary, waqif | reports: true | ✅ | ✅ |
| `/beneficiary/accounts` | admin, beneficiary, waqif | accounts: true | ✅ | ✅ |
| `/beneficiary/support` | admin, beneficiary, waqif, accountant | support: false | ❌ مخفي | ✅ |
| `/beneficiary/bylaws` | admin, beneficiary, waqif | bylaws: true* | ✅ | ✅ |

**ملاحظة:** الواقف لا يملك `bylaws` في `DEFAULT_ROLE_PERMS.waqif` — لكنه يملكها ضمنياً لأن `!key || perms[key] !== false` تُرجع `true` عند عدم وجود المفتاح. هذا سلوك مقصود (default allow).

---

## ملخص نهائي

| # | البند | الحالة | أولوية |
|---|-------|--------|--------|
| F-01 | `as never` في crud factory + annual report | 🟡 مقبول | منخفضة |
| F-02 | تسجيل بيانات مستخدم في Edge Function logs | 🟡 تحسيني | منخفضة |
| F-03 | تناسق مسارات الواقف | ✅ سليم | — |
| الباقي (17 بند) | Edge Functions, CORS, Auth, Console, TypeScript | ✅ سليم | — |

---

## الخلاصة

**التطبيق في حالة ممتازة أمنياً وبرمجياً.** لا توجد ثغرات أمنية أو أخطاء وظيفية. البندان المتبقيان (F-01, F-02) تحسينيان ولا يؤثران على الأمان أو تجربة المستخدم. التقييم الإجمالي يبقى **9.5/10**.

**لا يوجد إصلاح إلزامي.** الإصلاح الوحيد المقترح (F-02) هو حذف تفاصيل المستخدم من `console.log` في Edge Function — سطران فقط.

