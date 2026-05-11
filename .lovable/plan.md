# خطة إغلاق المرحلة B (البنود 7، 9، 10)

## كشف مهم من الفحص المباشر

عند فحص الكود الفعلي، البندان **7 و10 مغلقان بالفعل**:

### ✅ البند 7 — `App.tsx` مفكوك بالفعل
```text
src/App.tsx          → 15 سطراً فقط، غلاف رفيع
src/app/providers.tsx
src/app/router.tsx
src/app/root-layout.tsx
```
لا حاجة لأي عمل.

### ✅ البند 10 — `supabase.from()` غير موجود في `hooks/data/`
```bash
$ rg -l "supabase\.from\(" src/hooks/data/
# 0 matches
```
لا حاجة لأي عمل.

### 🔴 البند 9 — 3 دوال فقط متبقية (وليس 4–6 كما ذُكر سابقاً)

تم التحقق المباشر — Adoption الفعلي:

| Function | الحالة الحقيقية |
|---|---|
| `dashboard-summary`, `beneficiary-summary`, `email-admin` | ✅ مُرحَّلة بالفعل لـ `authenticate()` |
| `zatca-onboard`, `zatca-renew`, `zatca-report` | ✅ مُرحَّلة بالفعل |
| `admin-manage-users`, `generate-invoice-pdf` | ✅ مُرحَّلة بالفعل |
| **`zatca-signer`** | ❌ يستخدم `supaAuth.auth.getUser()` يدوياً |
| **`zatca-xml-generator`** | ❌ يستخدم `supaAuth.auth.getUser()` يدوياً |
| **`ai-assistant`** | ❌ يستخدم `userClient.auth.getUser()` + rate limit مزدوج (دقيقة + يومي) |
| `webauthn`, `guard-signup`, `lookup-national-id`, `auth-email-hook`, `health-check`, `process-email-queue`, `check-contract-expiry` | ⛔ مستثناة معمارياً (anon / webhook / cron / dual-mode) |

---

## نطاق التنفيذ

### M1 — `zatca-signer` (سهل)
- استبدال block `getUser()` اليدوي + parsing body بـ:
  ```typescript
  const auth = await authenticate(req, corsHeaders, {
    allowedRoles: ['admin', 'accountant'],
    parseJsonBody: true,
  });
  if ('error' in auth) return auth.error;
  const { user, admin, body } = auth;
  ```
- إزالة `supaAuth` و`createClient` المحلي.
- باقي منطق التوقيع (ECDSA P-256، ICV chain، QR TLV) **لا يُمَس**.

### M2 — `zatca-xml-generator` (سهل، مطابق لـ M1)
- نفس الاستبدال بنفس النمط.
- منطق UBL 2.1 XML builder **لا يُمَس**.

### M3 — `ai-assistant` (متوسط — يتطلب توسيع `authenticate()` أو تغليفه)
- المشكلة: `authenticate()` يدعم rate-limit واحد فقط؛ `ai-assistant` يحتاج اثنين (per-minute + per-day).
- **خياران:**
  - **(أ)** تمرير rate-limit الأساسي (per-minute) عبر `authenticate()`، ثم فحص quota اليومي يدوياً بعدها (يحتفظ بنفس البنية الحالية لكن يحذف 30 سطراً من boilerplate).
  - **(ب)** توسيع `AuthOptions` لقبول array من rate limits — تعديل `_shared/auth.ts` (أكثر تأثيراً، يخدم استخدامات مستقبلية).
- **التوصية:** الخيار (أ) — يحقق التوحيد دون تغيير العقد العام لـ `authenticate()`.
- منطق Lovable AI Gateway + role-scoping + SSE streaming **لا يُمَس**.

### M4 — توثيق
- تحديث `docs/api/network-inventory.md` §6 (Auth Adoption Matrix):
  - 5/17 → **8/17 Full** بعد M1+M2+M3.
  - حذف `zatca-signer`, `zatca-xml-generator`, `ai-assistant` من قائمة "مرشحات الترحيل".

---

## ضمانات السلامة

- **لا تغيير على CORS** (`getCorsHeaders` يبقى).
- **لا تغيير على rate-limit policy** للمستخدم النهائي:
  - `zatca-signer`/`xml-generator`: لا rate-limit حالياً ⇒ سنضيف افتراضياً (30/دقيقة) — حماية إضافية.
  - `ai-assistant`: نفس الحدود (30/دقيقة + 2000/يوم).
- **لا تغيير على RLS أو DB schema**.
- **لا تغيير على عقود الـ JSON** (request/response).
- اختبار يدوي عبر `supabase--test_edge_functions` لكل دالة بعد التعديل.

---

## التفاصيل التقنية

| الملف | عدد الأسطر المتأثرة (تقدير) |
|---|---|
| `supabase/functions/zatca-signer/index.ts` | ~25 سطراً تُحذف، ~6 تُضاف |
| `supabase/functions/zatca-xml-generator/index.ts` | ~25 سطراً تُحذف، ~6 تُضاف |
| `supabase/functions/ai-assistant/index.ts` | ~35 سطراً تُحذف، ~10 تُضاف |
| `docs/api/network-inventory.md` | تحديث جدول §6 + خلاصة §6 |

**لا تغيير على:**
- `_shared/auth.ts` (الخيار أ في M3 لا يحتاجه)
- أي ملف frontend
- أي migration / RLS

---

## الخطوة التالية

عند الموافقة، سأنفّذ M1 → M2 → M3 → M4 بالترتيب، مع `supabase--test_edge_functions` بعد كل دالة للتحقق.
