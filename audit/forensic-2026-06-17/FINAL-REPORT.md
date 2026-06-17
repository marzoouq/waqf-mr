# 🔬 التقرير الجنائي الموحّد — الجولة الثانية (2026-06-17)

> 8 موجات فحص (W1..W8) — تم تنفيذها بالكامل. هذا التقرير يدمج كل النتائج، يميّز ما تم إصلاحه فعلياً وما لم يتم، ويربط كل بند بالملف ورقم السطر.

---

## 📊 ملخص تنفيذي

| الموجة | المجال | Findings | 🔴 | 🟠 | 🟡 | الحالة |
|--------|--------|----------|-----|-----|-----|---------|
| **W1** | Foundation (main/auth listener/client) | 3 | 1 | 2 | 0 | ⏸️ مفتوحة |
| **W2** | Routing & Auth | 25 | 5 | 8 | 12 | ⏸️ مفتوحة (1 false positive) |
| **W3** | Admin pages (logic-in-components) | 4 | 0 | 2 | 2 | ⏸️ مفتوحة |
| **W4** | Beneficiary/Waqif PII | 10 | 0 | 0 | 10 | ✅ 4 false-positive موثّقة (R-NOW) |
| **W5** | Edge Functions & Integrations | 28 | 3 | 9 | 16 | ⏸️ مفتوحة |
| **W6** | Database (RLS/RPC/indexes) | 30 | 3 | 14 | 7 | ⏸️ مفتوحة (6 PASS) |
| **W7** | المنطق المالي E2E | 11 | 1 | 3 | 7 | ✅ 1 مُصلح + 4 false-positive (R-NOW) |
| **W8** | Perf/A11y/PWA/SEO/Tests | 25 | 3 | 5 | 13 | ⏸️ مفتوحة |
| **الإجمالي** | — | **136** | **16** | **43** | **77** | — |

---

## ✅ ما تم إصلاحه فعلياً في R-NOW

| الكود | الملف | الوصف |
|-------|------|--------|
| W7-1 | `src/lib/services/invoicesService.ts:33-47` | حارس `status` يرفض حذف الفواتير `paid`/`partially_paid` بقذف استثناء عربي قبل أي تعديل DB/Storage. |

## 🔵 إيجابيات كاذبة موثّقة (تم التحقق منها بأدلة من DB/Edge)

| الكود | السبب |
|-------|------|
| W4 F-01..F-04 | عرض `contracts_safe` يُقنّع `tenant_name` تلقائياً إلى `'***'` لغير المُميَّز — لا تسرّب فعلي. |
| W7 #2 (reserve_icv) | مُستدعى في `supabase/functions/zatca-signer/index.ts:93` — البحث الأصلي اقتصر على `src/`. |
| W7 #3 (distribution race) | `execute_distribution` SECURITY DEFINER + FOR UPDATE + إعادة حساب server-side. |
| W7 #6 (carryforward NULL) | `to_fiscal_year_id IS NULL` مقصود (ترحيل مفتوح). |
| W2 F-08/F-23 (مكرران) | تم دمجهما في توصية واحدة. |

---

## 🚨 الأولويات الحرجة المتبقية (16 🔴)

### A. أمن قاعدة البيانات (W6) — استغلال فوري محتمل
1. **W6-F01/F02/F03** — دوال SECURITY DEFINER بدون role guard، قابلة للاستدعاء من أي `authenticated`:
   - `get_support_stats`, `get_support_analytics` → كشف إحصائيات تذاكر الدعم.
   - `get_total_beneficiary_percentage` → كشف توزيع نسب المستفيدين.

### B. تكاملات Edge (W5)
2. **W5-#24/#25** `zatca-onboard` و`zatca-renew` لديهما fallback إلى `Deno.env.get("ZATCA_OTP")` يتجاوز vault والـ single-use → إزالة الـ fallback.
3. **W5-#10** `ai-assistant/index.ts:126` بلا AbortController → Deno worker يتجمّد عند upstream hang.
4. **W5-#6** `lookup-national-id/index.ts:202` يطبع رسالة DB قد تحوي `national_id`.

### C. المصادقة وWebAuthn (W2)
5. **W2-F13** WebAuthn يُرجع access/refresh tokens في body → نقل إلى HttpOnly cookie.
6. **W2-F05/F08/F23** سباقات في `useAuthListener.ts` + استخدام `getSession()` antipattern.
7. **W2-F18** `?from=` غير مُستهلك بعد login → فقدان redirect-back.

### D. منطق التطبيق الأساسي (W1, W8)
8. **W1** سباق `removeSplash()` و assignment مزدوج للدور.
9. **W8-#2** صفر مسارات lazy — كل الصفحات eager → bundle مضخّم.
10. **W8-#3** لا `<main>` landmark في `DashboardLayout` (A11y).
11. **W8-#1** 3 اختبارات فاشلة (useSupportAnalytics + usePropertyChecklist + DB check).

---

## 📁 مرجع الملفات

| ملف | المحتوى |
|-----|---------|
| `audit/forensic-2026-06-17/W1-foundation.md` | تفاصيل W1 (3 findings) |
| `audit/forensic-2026-06-17/W2-routing-auth.md` | تفاصيل W2 (25 findings) |
| `audit/forensic-2026-06-17/W3-admin.md` | تفاصيل W3 (4 findings) |
| `audit/forensic-2026-06-17/W4-beneficiary.md` | تفاصيل W4 (10 findings) |
| `audit/forensic-2026-06-17/W5-edge-functions.md` | تفاصيل W5 (28 findings) |
| `audit/forensic-2026-06-17/W6-database.md` | تفاصيل W6 (30 findings) |
| `audit/forensic-2026-06-17/W7-financial.md` | تفاصيل W7 (11 findings) |
| `audit/forensic-2026-06-17/W8-perf-a11y-tests.md` | تفاصيل W8 (25 findings) |
| `audit/forensic-2026-06-17/R-NOW-EXECUTED.md` | الإصلاحات الفورية + إيجابيات كاذبة |

---

## 🎯 خارطة طريق مقترحة للموجات التصحيحية القادمة

| الجولة | النطاق | المدة | البنود |
|--------|--------|-------|--------|
| **R5** | DB hardening | يوم | W6-F01..F06 + F27 + GRANTs (F17) |
| **R6** | ZATCA + Edge | يوم | W5-#10/#24/#25/#18-20/#6/#7 |
| **R7** | Auth & WebAuthn | 2 يوم | W2 (F05/F08/F13/F18/F23) + W1 |
| **R8** | Perf & A11y | 2 يوم | W8 lazy routes + `<main>` + RTL + tests fix |
| **R9** | DB cleanup | نصف يوم | حذف الفهارس المكررة (W6-F07..F16) |
| **R10** | تجميل وLow | يوم | باقي 🟡/🔵 |

---

## ❌ ما لم يتم في هذه الجولة (صراحة)

- لم تُنفَّذ أي إصلاحات سوى W7-1.
- لم تُجرَ اختبارات regression تلقائية بعد التغيير الوحيد.
- لم تُحدَّث `security_memory` لأن الإصلاحات لاحقاً.
- لم يُلمس أي ملف من قائمة المحمية (`config.toml`, `client.ts`, `types.ts`, `.env`).

**التوصية:** ابدأ بـ **R5 (DB hardening)** لأنها أكثر الموجات احتواءً على مخاطر استغلال فورية (3 🔴 RPC مكشوفة لأي authenticated).
