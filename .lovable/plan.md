

# خطة الإصلاحات ذات الأولوية القصوى — 3 محاور

---

## المحور 1: إصلاح مشكلة ai_chat_sessions + تحديث INDEX.md + التحقق من pgcrypto

### النتائج الجنائية

| البند | الواقع |
|-------|--------|
| `ai_chat_sessions` | أُنشئ في migration ثم حُذف في migration لاحقة. الجدول **غير موجود** لكن الدالة `update_ai_chat_sessions_updated_at` **يتيمة** لا تزال موجودة |
| `pgcrypto` schema | **مُصحّح فعلاً** — موجود في `extensions` (ليس `public`) |
| أعداد INDEX.md | قديمة بشكل كبير |

### الأعداد الفعلية مقابل الموثقة

| البند | INDEX.md | الفعلي | الفرق |
|-------|----------|--------|-------|
| جداول/عروض | 38 | 39 | +1 |
| دوال مخزنة | 36+ | 73 | +37 |
| مشغلات | 29+ | 53 | +24 |
| Edge Functions | 11 | 14 | +3 |
| سياسات RLS | 129 | 134 | +5 |
| مهام cron | 7 | 8 | +1 |

### الإصلاحات المطلوبة

1. **Migration**: حذف الدالة اليتيمة `update_ai_chat_sessions_updated_at()`
2. **docs/ADMIN-PAGES.md**: حذف ذكر `ai_chat_sessions` من قسم المساعد الذكي (سطر 393-400) وتوضيح أن المحادثات تُحفظ محلياً فقط
3. **docs/INDEX.md**: تحديث جميع الأعداد بالقيم الفعلية (39 جدول، 73 دالة، 53 مشغل، 14 وظيفة، 134 سياسة، 8 مهام cron)

---

## المحور 2: فحص Edge Functions والتحقق من getUser()

### نتائج الفحص — كل الوظائف مُؤمّنة

| الوظيفة | المصادقة | ملاحظات |
|---------|----------|---------|
| `admin-manage-users` | ✅ `getUser()` | + تحقق admin role |
| `ai-assistant` | ✅ `getUser()` | + rate limiting |
| `beneficiary-summary` | ✅ `getUser()` | مُؤمّنة |
| `check-contract-expiry` | ✅ `getUser()` | + service_role check |
| `dashboard-summary` | ✅ `getUser()` | مُؤمّنة |
| `generate-invoice-pdf` | ✅ `getUser()` | مُؤمّنة |
| `webauthn` | ✅ `getUser()` | + webhook verify |
| `zatca-onboard` | ✅ `getUser()` (via shared) | مُؤمّنة |
| `zatca-renew` | ✅ `getUser()` (via shared) | مُؤمّنة |
| `zatca-report` | ✅ `getUser()` (via shared) | مُؤمّنة |
| `zatca-signer` | ✅ `getUser()` | مُؤمّنة |
| `zatca-xml-generator` | ✅ `getUser()` | مُؤمّنة |
| `guard-signup` | ⚡ عامة (مقصود) | rate limit + لا بيانات حساسة |
| `health-check` | ⚡ عامة (مقصود) | لا بيانات حساسة |
| `auth-email-hook` | ⚡ Webhook (مقصود) | Supabase-initiated + webhook verify |
| `lookup-national-id` | ⚡ عامة (مقصود) | rate limit + تأخير + إخفاء بريد |

**الحكم**: ✅ جميع الوظائف مُؤمّنة بشكل صحيح. الوظائف العامة الأربع مُبررة ومحمية بآليات بديلة.

### Linter

الـ linter يُظهر خطأين فقط (Security Definer Views) وهما **مقصودان معمارياً** ومُوثّقان في SECURITY-KNOWLEDGE.md — لا إجراء مطلوب.

### إصلاح مطلوب

4. **docs/API.md**: إضافة توثيق 3 وظائف مفقودة: `health-check`, `dashboard-summary`, `beneficiary-summary`

---

## المحور 3: اختبار سرعة التحميل على الموبايل

هذا يتطلب فتح المعاينة واختبار تفاعلي على viewport موبايل لقياس:
- سرعة تحميل لوحة المستفيد (`/beneficiary`)
- سرعة تحميل سجل المراجعة (`/dashboard/audit-log`)
- Web Vitals (LCP, FID, CLS)

**سيتم التنفيذ بعد الإصلاحات** عبر أدوات المتصفح (performance_profile + profiling).

---

## ملخص المهام

| # | المهمة | النوع |
|---|--------|-------|
| 1 | حذف دالة `update_ai_chat_sessions_updated_at` اليتيمة | Migration |
| 2 | تحديث ADMIN-PAGES.md — إزالة ذكر ai_chat_sessions | توثيق |
| 3 | تحديث INDEX.md — تصحيح جميع الأعداد | توثيق |
| 4 | تحديث API.md — إضافة 3 وظائف مفقودة | توثيق |
| 5 | اختبار أداء الموبايل (لوحة المستفيد + سجل المراجعة) | اختبار تفاعلي |

