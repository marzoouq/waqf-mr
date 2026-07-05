# حالة تنفيذ التقارير الجنائية — البنود المتبقية

مسحت 15 ملف تنفيذ (`R1..R11 + R-NOW/RESCAN + SIDEBAR-P0/P1 + forensic-06-22/CHANGELOG`) وقارنت مع تقارير الفحص الأصلية (W1..W8، SIDEBAR-ADMIN، forensic-06-22). فيما يلي **البنود غير المنفَّذة أو المؤجَّلة فقط** — البنود المكتملة (~85% من الإجمالي) لا تُذكر.

---

## 1) دَين معماري مؤجَّل بقرار صريح (لا يُنفَّذ بدون طلب)

| المعرف | البند | المصدر | مبرر التأجيل |
|---|---|---|---|
| **W2-F13** | نقل توكنات WebAuthn إلى HttpOnly cookie | R7, R10 | يتطلب BFF أو تعديل `client.ts` المحمي |
| **W6-002** | `contracts_safe` بـ `security_invoker=false` | R11, RESCAN-2 | مقصود — يخفي PII، موثَّق في memory |
| **A3 (Sidebar)** | `/beneficiary` غير قابل للإخفاء عبر الأقسام | SIDEBAR-ADMIN §7 | قيد بنيوي مقبول |
| **C4 (Sidebar)** | مجموعة `finance` بـ9 عناصر | SIDEBAR-ADMIN §3 | مقصود |
| **C6 (Sidebar)** | المحاسب محروم من `comparison` | SIDEBAR-ADMIN §3 | سياسة صلاحيات معتمدة |
| **F24** | bucket `waqf-assets` عام | forensic-06-22 | مقصود لـ Edge PDF/Email |
| **F25** | CORS في `auth-email-hook` | forensic-06-22 | Supabase Auth webhook — يجب أن يكون مفتوحاً |

---

## 2) بنود مؤجَّلة تحتاج قرار المستخدم

| المعرف | البند | المصدر | ما ينقص |
|---|---|---|---|
| **F2** | `.env` متعقَّب في git | forensic-06-22 + forensic-07-05 | يتطلب أمر git يدوي: `git rm --cached .env` + push |
| **F5** | تحقيق `xact_rollback` في DB | forensic-06-22 | مراقبة زمنية على prod |
| **F8/F13** | Edge `beneficiary-summary` نقطة عامة + PII | forensic-06-22 | قرار: هل يظل عام أم يُحمى بـ JWT؟ |
| **F9** | `useNotificationActions` يستخدم toast داخل hooks/data | forensic-06-22 | refactor بتأثير سلوكي — يحتاج مراجعة |
| **W6-004** | FK مباشر لـ `auth.users` على `user_roles`/`beneficiaries` | R2 §مؤجَّل | يتطلب data migration + backfill + rollback plan |
| **W5-021** | تجزئة IP في `access_log` مع salt دوّار | R2, R4 | يغيّر عمود قائم + يحتاج migration بيانات |

---

## 3) تحسينات أداء/جودة مؤجَّلة (غير حرجة)

| المعرف | البند | المصدر |
|---|---|---|
| **W6-F19..F24** | حذف فهارس غير مستخدمة (6 فهارس) | R5, R9 — يحتاج 30 يوم مراقبة على prod |
| **F19** | 7 hooks ميتة موسومة `@deprecated` — لم تُحذف | forensic-06-22 (فترة مراقبة) |
| **P2 (07-05)** | فهرس مركّب `payment_invoices(fiscal_year_id, due_date)` | **نُفِّذ في 07-05** ✅ (لم يعد مؤجَّلاً) |
| **W8-#4** | `border-l/r`, `left-/right-`, `rounded-l/r-` RTL sweep | R8-v2 — خارج نطاق W8 الأصلي |
| **R3-Defer** | 5 صفحات لا تزال بـ inline `queryKey` | R3 §مؤجَّل — لا ضرر أمني، ESLint rule تمنع الجديد |

---

## 4) بنود ضجيج linter بلا إجراء (موثَّقة كإيجابيات مقصودة)

- **71–184 warning** من نوع `SECURITY DEFINER Function Executable` على `has_role`, `is_fiscal_year_accessible`, `check_rate_limit`, `execute_distribution`, `commit_icv_chain`, etc. — كلها محمية داخلياً بـ `has_role()` وضرورية لتفادي RLS recursive.
- **1 ERROR** ثابت على `contracts_safe` view — مقصود (البند W6-002 أعلاه).
- **1 WARN** `Public Bucket Allows Listing` على `waqf-assets` — مقصود (F24 أعلاه).

---

## 5) الإجراء المقترح

سأكتب هذا التلخيص كملف قابل للتنزيل:
- `/mnt/documents/DEFERRED-ITEMS-STATUS-2026-07-05.md` — نفس المحتوى أعلاه بتنسيق قابل للطباعة.

**قرارات تحتاج منك:**
1. هل نُنفّذ **F2** (`git rm --cached .env`)؟ يحتاج أمر يدوي من طرفك.
2. هل نغلق **F8/F13** بإضافة JWT verify على `beneficiary-summary`؟
3. هل نبدأ **W6-004** (FK migration) الآن أم يظل مؤجَّلاً؟
4. هل نحذف الـ7 hooks الميتة الموسومة `@deprecated` (F19) بعد شهر مراقبة؟

اضغط "Implement plan" لأكتب الملف، أو أخبرني أي قرار من الأربعة تريد تنفيذه أولاً.
