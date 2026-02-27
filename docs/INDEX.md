<div dir="rtl">

# 📚 فهرس التوثيق — نظام إدارة وقف مرزوق بن علي الثبيتي

> نقطة الدخول الموحدة لكافة ملفات التوثيق في المشروع

---

## حالة الفحص الأخير

| البند | القيمة |
|-------|--------|
| تاريخ الفحص | 2026-02-27 (الجولة 16) |
| الجداول المحمية بـ RLS | 19 جدول (17 جدول + 1 عرض `beneficiaries_safe` + `access_log`) |
| المشغلات النشطة | 29 (10 audit + 4 prevent_closed_fy + 9 updated_at + 6 storage/realtime/cron) |
| Edge Functions | 8 وظائف (مع تقييد AI حسب الدور) |
| نموذج AI | google/gemini-2.5-pro + flash |
| التقييم الأمني | 9.8/10 |

---

## الملفات

| # | الملف | الوصف | الرابط |
|---|-------|-------|--------|
| 1 | **README** | التوثيق الرئيسي: البنية، التقنيات، الأدوار، المسارات | [README.md](../README.md) |
| 2 | **قاعدة البيانات** | مخطط ERD، 19 جدول/عرض، الأعمدة، سياسات RLS، 21 دالة، 29 مشغل | [DATABASE.md](./DATABASE.md) |
| 3 | **واجهة البرمجة** | توثيق 8 Edge Functions مع أمثلة الاستدعاء | [API.md](./API.md) |
| 4 | **صفحات المستفيد** | الإفصاح، حصتي، التقارير المالية، الحسابات | [BENEFICIARY-PAGES.md](./BENEFICIARY-PAGES.md) |
| 5 | **صفحات الناظر** | لوحة التحكم، الحسابات الختامية، التقارير، آلية الإقفال | [ADMIN-PAGES.md](./ADMIN-PAGES.md) |
| 6 | **خطة الإصلاح الجنائي** | سجل كامل لـ 17 إصلاح أمني عبر 4 جولات | [FORENSIC-FIX-PLAN.md](./FORENSIC-FIX-PLAN.md) |

---

## دليل سريع

### 🏗️ البنية العامة
← [README.md](../README.md) — هيكل المجلدات، التقنيات المستخدمة، أنماط التصميم

### 🗄️ قاعدة البيانات
← [DATABASE.md](./DATABASE.md) — 19 جدول/عرض، 29 مشغل، علاقات، سياسات أمان، 21 دالة مخزنة

### 🔌 الواجهات البرمجية
← [API.md](./API.md) — 8 Edge Functions: إدارة المستخدمين، المساعد الذكي (gemini-2.5-pro + flash مع تقييد حسب الدور)، انتهاء العقود، تنبيهات العقود، البحث بالهوية، حماية التسجيل، توليد فواتير PDF

### 👥 واجهة المستفيد
← [BENEFICIARY-PAGES.md](./BENEFICIARY-PAGES.md) — الإفصاح السنوي، حصتي من الريع، التقارير المالية، الحسابات

### 🔧 واجهة الناظر
← [ADMIN-PAGES.md](./ADMIN-PAGES.md) — لوحة التحكم، الحسابات الختامية، التقارير، آلية الإقفال والأرشفة

### 📄 الصفحات العامة
- سياسة الخصوصية (`/privacy-policy`)
- شروط الاستخدام (`/terms-of-use`)

---

## خريطة المسارات (27 مسار)

### مسارات عامة
| المسار | الوصف |
|--------|-------|
| `/` | الصفحة الرئيسية |
| `/auth` | تسجيل الدخول |
| `/privacy-policy` | سياسة الخصوصية |
| `/terms-of-use` | شروط الاستخدام |
| `/unauthorized` | صفحة عدم الصلاحية |

### مسارات الناظر (`/dashboard/*`)
| المسار | الوصف |
|--------|-------|
| `/dashboard` | لوحة التحكم الرئيسية |
| `/dashboard/properties` | إدارة العقارات |
| `/dashboard/contracts` | إدارة العقود |
| `/dashboard/income` | إدارة الإيرادات |
| `/dashboard/expenses` | إدارة المصروفات |
| `/dashboard/beneficiaries` | إدارة المستفيدين |
| `/dashboard/accounts` | الحسابات الختامية |
| `/dashboard/reports` | التقارير |
| `/dashboard/invoices` | الفواتير والمستندات |
| `/dashboard/messages` | الرسائل |
| `/dashboard/settings` | الإعدادات |
| `/dashboard/users` | إدارة المستخدمين |
| `/dashboard/audit-log` | سجل المراجعة |

### مسارات المستفيد (`/beneficiary/*`)
| المسار | الوصف |
|--------|-------|
| `/beneficiary` | لوحة المستفيد |
| `/beneficiary/disclosure` | الإفصاح السنوي |
| `/beneficiary/my-share` | حصتي من الريع |
| `/beneficiary/financial-reports` | التقارير المالية |
| `/beneficiary/accounts` | عرض الحسابات |
| `/beneficiary/invoices` | عرض الفواتير |
| `/beneficiary/messages` | الرسائل |
| `/beneficiary/notifications` | الإشعارات |

---

## التسلسل المالي (مرجع سريع)

```
إيرادات + رصيد مرحل = إجمالي شامل
  − مصروفات = صافي بعد المصاريف
  − ضريبة = صافي بعد الضريبة
  − زكاة = صافي بعد الزكاة
  − حصة ناظر − حصة واقف = ريع الوقف
  − رقبة وقف = المبلغ المتاح
  − توزيعات = الرصيد المتبقي
```

> 📖 التفاصيل الكاملة في [ADMIN-PAGES.md](./ADMIN-PAGES.md#2-الحسابات-الختامية-accountspage) و [BENEFICIARY-PAGES.md](./BENEFICIARY-PAGES.md)

---

## سجل التحديثات الأمنية

| التاريخ | الإصلاح |
|---------|---------|
| 2026-02-20 | تشديد `log_access_event` — تقييد `anon` لأحداث login/signup فقط |
| 2026-02-20 | سحب صلاحيات `EXECUTE` من `anon`/`PUBLIC` للدوال الحساسة |
| 2026-02-20 | إزالة `unsafe-eval` من CSP |
| 2026-02-20 | تأمين `check-contract-expiry` بمصادقة مزدوجة (service_role + admin JWT) |
| 2026-02-27 | تعقيم `body.name` في `admin-manage-users` (create_user + bulk_create_users) |
| 2026-02-27 | إخفاء تفاصيل العقد عن المستفيدين في `cron_check_contract_expiry` |
| 2026-02-27 | دمج SELECT+UPDATE في `useUpdateAdvanceStatus` لمنع TOCTOU |
| 2026-02-27 | تعقيم رسائل خطأ WebAuthn و `generate-invoice-pdf` |
| 2026-02-27 | تقييد `fetchWaqfData` حسب الدور (AI Assistant) |
| 2026-02-27 | رفض طلب AI عند فشل جلب الدور (بدلاً من الافتراض كمستفيد) |
| 2026-02-27 | تعقيم `error.message` في `useAccountsPage` (موضعان) |
| 2026-02-27 | إصلاح `isAdmin` temporal dead zone في `fetchWaqfData` |

</div>
