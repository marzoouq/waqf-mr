
# تقرير الفحص الجنائي الشامل — الحالة الفعلية للكود

## المنهجية
قراءة مباشرة سطر بسطر لكل Edge Function، كل هوك، كل migration، كل RLS policy. لا افتراضات.

---

## القسم الأول: ما تم التحقق منه وتأكيد سلامته

| البند | الملف | الدليل |
|-------|-------|--------|
| `execute_distribution` idempotency guard | DB function سطر 41-48 | `IF EXISTS ... RAISE EXCEPTION` |
| `execute_distribution` server-side SUM | DB function سطر 116-124 | `SELECT COALESCE(SUM(amount),0) INTO v_actual_total` |
| `admin-manage-users` سطر 65 | Edge Function | `"إجراء غير صالح"` (ثابت) |
| `admin-manage-users` سطر 395 default | Edge Function | `"إجراء غير صالح"` (ثابت) |
| `admin-manage-users` error sanitization | Edge Function سطر 404-411 | `safeMessages` + prefix filtering |
| `signUp` error handling | `AuthContext.tsx:191` | `getSafeErrorMessage(error)` |
| `guard-signup` لا يكشف أخطاء داخلية | `guard-signup/index.ts:91` | `"تعذر إتمام التسجيل"` |
| `webauthn` origin whitelist | `webauthn/index.ts:28-34` | `ALLOWED_ORIGINS` + patterns |
| `webauthn` getUserById error handling | `webauthn/index.ts:282-285` | `userError` checked |
| `webauthn` email removed from response | `webauthn/index.ts:298` | Only `token_hash` returned |
| `webauthn` challenge_id linkage | `webauthn/index.ts:215-232` | `challenge_id` parameter used |
| `webauthn` register-verify deletes specific challenge | `webauthn/index.ts:179-181` | `.eq("challenge", challengeRow.challenge)` |
| `lookup-national-id` DB-backed rate limiting | `lookup-national-id/index.ts:33` | `check_rate_limit` RPC |
| `lookup-national-id` no setInterval | `lookup-national-id/index.ts` | Fully removed |
| `ai-assistant` rate limiting | `ai-assistant/index.ts:36-53` | DB-backed `check_rate_limit` |
| `ai-assistant` no rlError.message leak | `ai-assistant/index.ts:42` | `console.error("ai rate_limit check failed")` |
| `useTenantPayments` limit + staleTime | `useTenantPayments.ts:34,38` | `.limit(500)` + `staleTime: 60_000` |
| `useTenantPayments` error.message sanitized | `useTenantPayments.ts:106-107` | `console.error` only, toast is generic |
| `useAuditLog` staleTime | `useAuditLog.ts:62` | `staleTime: 30_000` |
| `useWebAuthn` fetchCredentials limit | `useWebAuthn.ts:28` | `.limit(20)` |
| `useDistribute` as any removed | `useDistribute.ts:44` | `JSON.parse(JSON.stringify(distributions))` |
| `useCarryforwardBalance` documented | `useAdvanceRequests.ts:106-109` | Comment explains intentional behavior |
| `prevent_closed_fy_distributions` trigger | Migration | Created and active |
| `removeCredential` RLS protection | RLS policy | `DELETE USING (auth.uid() = user_id)` |
| `check-contract-expiry` timing-safe compare | `check-contract-expiry/index.ts:19-26` | XOR loop |
| CORS dynamic per-request | `_shared/cors.ts` | `getCorsHeaders(req)` with whitelist |

**الخلاصة: جميع المشاكل المُبلّغ عنها سابقاً (من الجولات 1 و 2) تم إصلاحها بالفعل.**

---

## القسم الثاني: مشاكل مكتشفة حقيقية (جديدة)

### 1. [متوسط - وظيفي] `notifyUser` client-side INSERT يفشل صامتاً للمستفيدين

```text
ملف: src/utils/notifications.ts سطر 56-57
```

**التحليل:** دالة `notifyUser()` تنفذ `supabase.from('notifications').insert(...)` مباشرة من المتصفح. لكن RLS على جدول `notifications` **لا تحتوي على INSERT policy لغير الأدمن**:

- `Admins can manage all notifications` (ALL) -- admin فقط
- لا توجد INSERT policy لـ authenticated/beneficiary

**النتيجة:** عندما يستدعي المستفيد `notifyAdmins()` من `useCreateAdvanceRequest` (سطر 193)، الاستدعاء يمر عبر RPC `notify_admins` وهو SECURITY DEFINER -- **يعمل بشكل صحيح**.

لكن عندما يستدعي الناظر `notifyUser(beneficiary_user_id, ...)` من `useUpdateAdvanceStatus` (سطر 270)، الناظر لديه INSERT عبر `Admins can manage all notifications` -- **يعمل أيضاً**.

**بعد التحقق الدقيق: المشكلة الفعلية محدودة.** الحالة الوحيدة التي قد تفشل هي إذا استدعى المحاسب (`accountant`) دالة `notifyUser` -- لأنه ليس admin ولا توجد INSERT policy له. لكن `useUpdateAdvanceStatus` متاحة للناظر فقط عبر الواجهة.

**الحكم:** ليست ثغرة أمنية. لكن يُفضّل إضافة INSERT policy للمحاسب أو نقل كل الإشعارات لـ RPC server-side.

---

### 2. [منخفض - اتساق] `useWebAuthn` سطر 97 -- `error.message` يُعرض للمستخدم

```typescript
// useWebAuthn.ts سطر 97
toast.error(`حدث خطأ أثناء تسجيل البصمة: ${message}`);
```

`message` هنا من `DOMException` أو `Error` عام من المتصفح -- وليس من Supabase/PostgREST. لذلك لا يحتوي على تفاصيل DB. لكنه يكسر نمط الرسائل العربية الموحدة.

**الإصلاح:** استبدال بـ `toast.error('حدث خطأ أثناء تسجيل البصمة')`.

---

### 3. [منخفض - أداء] `ai-assistant` يجلب كل البيانات في كل طلب بدون caching

```text
ملف: supabase/functions/ai-assistant/index.ts سطر 81
```

الدالة `fetchWaqfData()` تجلب 8 استعلامات من قاعدة البيانات (fiscal_years, accounts, properties, contracts, income, expenses, beneficiaries, distributions) في كل طلب AI. مع service_role_key. لا يوجد أي caching.

**التأثير:** في استخدام عادي (30 طلب/دقيقة للمستخدم الواحد) -- 240 استعلام DB في الدقيقة من مستخدم واحد. ليس خطيراً لكنه غير مثالي.

**الإصلاح المقترح:** إضافة TTL cache بسيط (مثلاً 30 ثانية) داخل الـ Edge Function، أو تقليل الاستعلامات بدمجها.

---

### 4. [منخفض - جودة كود] `generate-invoice-pdf` يكشف `invalidIds` في رسالة الخطأ

```typescript
// generate-invoice-pdf/index.ts سطر 458
return new Response(JSON.stringify({ error: "Invalid UUID format in invoice_ids", invalid: invalidIds }), ...);
```

يعيد المعرفات غير الصالحة للعميل. هذا ليس خطيراً (المستخدم أرسلها أصلاً) لكنه يكسر نمط تعقيم الأخطاء المتبع في باقي الكود.

**الإصلاح:** حذف `invalid: invalidIds` وإبقاء رسالة عامة فقط.

---

### 5. [منخفض - دقة] `check-contract-expiry` Edge Function: تكرار منطق الإشعارات مع `cron_check_contract_expiry` SQL

الكود يحتوي على منطقين منفصلين لنفس الوظيفة:
- `cron_check_contract_expiry()` -- PL/pgSQL function في DB
- `check-contract-expiry` Edge Function -- TypeScript

كلاهما ينفذ نفس المنطق (العقود القريبة من الانتهاء + التنبيه الأسبوعي). هذا ليس bug بل تكرار. لكن إذا تم تفعيل كلاهما عبر cron، ستُرسل إشعارات مكررة (الفلتر الموجود في كليهما يمنع ذلك جزئياً عبر مقارنة `message`).

---

## القسم الثالث: تأكيد سلامة البنية الأمنية

### RLS Policies -- تحقق شامل

| الجدول | SELECT | INSERT | UPDATE | DELETE | ملاحظة |
|--------|--------|--------|--------|--------|--------|
| `notifications` | `user_id = auth.uid()` | **admin فقط** | `user_id = auth.uid()` | `user_id = auth.uid()` | آمن |
| `webauthn_credentials` | `user_id = auth.uid()` | `user_id = auth.uid()` | **ممنوع** | `user_id = auth.uid()` | آمن |
| `audit_log` | admin+accountant | **ممنوع (false)** | **ممنوع (false)** | **ممنوع (false)** | آمن |
| `access_log` | admin فقط | **ممنوع (false)** | **ممنوع (false)** | **ممنوع (false)** | آمن |
| `rate_limits` | **ممنوع (false)** | **ممنوع (false)** | **ممنوع (false)** | **ممنوع (false)** | آمن |
| `distributions` | owner/admin/waqif | admin/accountant | admin/accountant | admin/accountant | آمن + trigger |

### Edge Functions -- ملخص الأمان

| الدالة | Auth | Rate Limit | Error Sanitization | CORS |
|--------|------|------------|-------------------|------|
| `admin-manage-users` | JWT + admin role | لا (admin فقط) | `safeMessages` | Dynamic |
| `guard-signup` | لا (عام) | DB-backed | ثابت عربي | Dynamic |
| `ai-assistant` | JWT + getUser | DB-backed 30/min | ثابت عربي | Dynamic |
| `lookup-national-id` | لا (عام) | DB-backed 3/min | ثابت عربي + timing-safe | Dynamic |
| `webauthn` | JWT (بعض الإجراءات) | لا (WebAuthn محمي ذاتياً) | ثابت عربي | Dynamic |
| `check-contract-expiry` | service_role OR admin JWT | لا | ثابت | Dynamic |
| `generate-invoice-pdf` | JWT + admin/accountant | DB-backed 10/min | جزئي (invalidIds) | Dynamic |

---

## الخلاصة النهائية

| الفئة | العدد |
|-------|-------|
| مشاكل مُبلّغة سابقاً -- تم إصلاحها | **25+** |
| مشاكل جديدة مكتشفة | **5** |
| منها: حرج | **0** |
| منها: متوسط | **1** (notifyUser للمحاسب -- وظيفي لا أمني) |
| منها: منخفض | **4** (تجميلي/اتساق) |

**التطبيق في حالة أمنية جيدة جداً.** الإصلاحات المتبقية كلها تجميلية ولا تمثل مخاطر أمنية أو مالية حقيقية. أبرزها:

1. تنظيف رسالة خطأ WebAuthn registration (سطر واحد)
2. حذف `invalid: invalidIds` من generate-invoice-pdf (سطر واحد)
3. توثيق التكرار بين cron DB function و Edge Function (لا يحتاج كود)

هل ترغب في تطبيق هذه التحسينات التجميلية؟
