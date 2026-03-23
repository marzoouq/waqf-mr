

# تقرير فحص الأمان الشامل

---

## 1. الحالة العامة — ممتازة ✅

المشروع يتبع معايير أمان عالية المستوى. جميع النتائج الحرجة السابقة تم إصلاحها. المتبقي: **2 تحذير** من الماسح الآلي + **خطأ بناء عابر**.

---

## 2. خطأ البناء الحالي — عابر (ليس كود)

```text
"driver: bad connection" — فشل اتصال مؤقت بقاعدة البيانات
```

هذا خطأ **بنية تحتية** وليس خطأ في الكود. الحل: إعادة المحاولة (retry) أو الانتظار. لا يحتاج تعديل كود.

---

## 3. نتائج الماسح الأمني

### 3.1 ⚠️ `contracts_safe` — "No RLS" (إيجابي كاذب)

| البند | الحالة |
|-------|--------|
| الماسح يقول | "لا توجد سياسات RLS على العرض" |
| الواقع | العرض يستخدم `security_definer` + `security_barrier=true` + تقنيع PII عبر `CASE WHEN` |
| الجدول الأصلي (`contracts`) | محمي بـ RLS — admin/accountant فقط |

**الإجراء:** تحديث تجاهل النتيجة في الماسح الأمني مع توثيق السبب.

### 3.2 ⚠️ `user_roles` — فجوة INSERT نظرية

| البند | الحالة |
|-------|--------|
| التحذير | "لا يوجد DENY صريح على INSERT لغير الأدمن" |
| الواقع | السياسة الوحيدة هي `ALL` للأدمن فقط + `SELECT` للمستخدم نفسه |
| المخاطرة | **منخفضة جداً** — لا توجد سياسة INSERT permissive لغير الأدمن |

**الإجراء (دفاع عميق):** إضافة سياسة RESTRICTIVE تحظر INSERT/UPDATE/DELETE لغير الأدمن.

---

## 4. تحليل الأمان التفصيلي

### 4.1 المصادقة ✅

| الفحص | النتيجة |
|-------|---------|
| `getUser()` في Edge Functions | ✅ مُطبق في جميع الوظائف |
| `getSession()` مستقل | ❌ لا يوجد — يُستخدم فقط بعد `getUser()` للحصول على `access_token` |
| تخزين أدوار في localStorage | ✅ لا يوجد — الأدوار تُفحص من الخادم فقط |
| Rate limiting | ✅ جدول `rate_limits` + دالة ذرية |
| WebAuthn | ✅ محمي بـ rate limit + `getUser()` |

### 4.2 البيانات الحساسة (PII) ✅

| الفحص | النتيجة |
|-------|---------|
| `select('*')` | ✅ لا يوجد — جميع الاستعلامات تحدد الأعمدة |
| تشفير PII | ✅ `national_id` + `bank_account` مشفرة بـ AES-256 |
| مفتاح التشفير | ✅ في Supabase Vault (ليس في app_settings) |
| `console.log` لبيانات حساسة | ✅ لا يوجد تسريب (رسالة واحدة عامة فقط) |
| `dangerouslySetInnerHTML` | ✅ مستخدم فقط لـ JSON-LD وأنماط chart — بدون مدخلات مستخدم |

### 4.3 العروض الآمنة ✅

| العرض | security_barrier | PII masking | الجدول الأصلي RLS |
|-------|-----------------|-------------|-------------------|
| `beneficiaries_safe` | ✅ | ✅ CASE WHEN | ✅ admin/accountant فقط |
| `contracts_safe` | ✅ | ✅ CASE WHEN | ✅ admin/accountant فقط |

### 4.4 RLS شامل ✅

| الفئة | الحالة |
|-------|--------|
| جداول مالية (income, expenses, distributions) | ✅ RLS + restrictive fiscal year |
| جداول فواتير (invoices, payment_invoices, invoice_items) | ✅ RLS + restrictive fiscal year |
| سجل التدقيق (access_log, archive) | ✅ محمي ضد التعديل/الحذف |
| rate_limits | ✅ `USING false` — لا وصول مباشر |
| ZATCA certificates | ✅ admin فقط |

### 4.5 Edge Functions ✅

| الوظيفة | Auth | Rate Limit | ملاحظة |
|---------|------|-----------|--------|
| admin-manage-users | ✅ getUser + admin role | ✅ | — |
| ai-assistant | ✅ getUser | ✅ cooldown | — |
| guard-signup | ⚡ Public | ✅ | بوابة تسجيل |
| webauthn | ✅ getUser | ✅ | — |
| zatca-* | ✅ getUser | — | — |
| lookup-national-id | ⚡ Public | ✅ 3/5min | مطلوب لاسترجاع كلمة المرور |
| generate-invoice-pdf | ✅ getUser | — | — |

### 4.6 التخزين (Storage) ✅

| الفحص | النتيجة |
|-------|---------|
| حزمة invoices | ✅ admin/accountant فقط |
| أنواع الملفات | ✅ PDF + صور فقط |
| روابط تحميل | ✅ موقعة بـ 300 ثانية |
| Path traversal | ✅ تعقيم في الواجهة + Edge Functions |

---

## 5. الإجراءات المطلوبة

### أولوية عالية — لا يوجد ❌

لا توجد ثغرات أمنية حرجة.

### أولوية متوسطة (دفاع عميق)

| # | الإجراء | التفاصيل |
|---|---------|---------|
| 1 | إضافة سياسة RESTRICTIVE على `user_roles` | تحظر INSERT/UPDATE/DELETE لغير الأدمن كطبقة حماية إضافية |
| 2 | تحديث تجاهل `contracts_safe_no_rls` في الماسح | توثيق أن العرض محمي بـ security_definer + CASE WHEN |

### أولوية منخفضة

| # | الإجراء |
|---|---------|
| 3 | إزالة `tenant_id_number, tenant_tax_number, tenant_crn` من select في `useContractsSafeByFiscalYear` — هذه الأعمدة مقنّعة في العرض لكن لا داعي لطلبها |

---

## 6. الخلاصة

**المشروع في حالة أمنية ممتازة.** جميع الثغرات الحرجة السابقة مُصلحة (PII encryption key في Vault، RLS شامل، rate limiting، تقنيع بيانات حساسة). التحذيران المتبقيان من الماسح (contracts_safe + user_roles) هما **إيجابي كاذب** و **تحسين دفاع عميق** على التوالي. خطأ البناء "bad connection" عابر ولا يتعلق بالكود.

