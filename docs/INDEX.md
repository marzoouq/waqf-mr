<div dir="rtl">

# 📚 فهرس التوثيق — نظام إدارة وقف مرزوق بن علي الثبيتي

> نقطة الدخول الموحدة لكافة ملفات التوثيق في المشروع

---

## حالة المشروع

| البند | القيمة |
|-------|--------|
| آخر تحديث | 2026-03-22 |
| الحالة | ✅ مستقر — جاهز للنشر |
| الإصدار | v3.0.0 |
| النطاق المخصص | `waqf-wise.net` |
| الجداول/العروض | 37 (33 جدول أصلي + 2 عرض آمن + `invoice_chain` + `invoice_items`) |
| الدوال المخزنة | 36+ دالة |
| المشغلات النشطة | 29+ |
| Edge Functions | 11 وظيفة |
| مهام مجدولة (pg_cron) | 7 مهام |
| سياسات RLS | 129 سياسة |
| نموذج AI | google/gemini-2.5-pro + flash عبر Lovable AI |
| التقييم الأمني | 9.5/10 |

---

## الملفات

| # | الملف | الوصف | الرابط |
|---|-------|-------|--------|
| 1 | **README** | التوثيق الرئيسي: البنية، التقنيات، الأدوار، المسارات | [README.md](../README.md) |
| 2 | **قاعدة البيانات** | مخطط ERD، 37 جدول/عرض، الأعمدة، سياسات RLS، 35+ دالة، 29+ مشغل | [DATABASE.md](./DATABASE.md) |
| 3 | **واجهة البرمجة** | توثيق 11 Edge Function مع أمثلة الاستدعاء | [API.md](./API.md) |
| 4 | **صفحات المستفيد** | الإفصاح، حصتي، التقارير المالية، الحسابات | [BENEFICIARY-PAGES.md](./BENEFICIARY-PAGES.md) |
| 5 | **صفحات الناظر** | لوحة التحكم، الحسابات الختامية، التقارير، آلية الإقفال | [ADMIN-PAGES.md](./ADMIN-PAGES.md) |
| 6 | **سجل التغييرات** | التحديثات الرئيسية بترتيب زمني | [CHANGELOG.md](./CHANGELOG.md) |
| 7 | **تقرير التدقيق** | ملخص 24 جولة تدقيق — جميع الإصلاحات الحرجة مُنجزة | [FINAL-AUDIT-REPORT.md](./FINAL-AUDIT-REPORT.md) |
| 8 | **المعرفة الأمنية** | إرشادات CSP، التشفير، سياسات RLS | [SECURITY-KNOWLEDGE.md](./SECURITY-KNOWLEDGE.md) |

---

## دليل سريع

### 🏗️ البنية العامة
← [README.md](../README.md) — هيكل المجلدات، التقنيات المستخدمة، أنماط التصميم

### 🗄️ قاعدة البيانات
← [DATABASE.md](./DATABASE.md) — 37 جدول/عرض، 29+ مشغل، علاقات، سياسات أمان، 36+ دالة مخزنة

### 🔌 الواجهات البرمجية
← [API.md](./API.md) — 11 Edge Function: إدارة المستخدمين، المساعد الذكي (gemini-2.5-pro + flash)، تنبيهات انتهاء العقود، البحث بالهوية، حماية التسجيل، توليد فواتير PDF، المصادقة البيومترية (WebAuthn)، قوالب البريد، ZATCA API، ZATCA Signer، ZATCA XML Generator

### 👥 واجهة المستفيد
← [BENEFICIARY-PAGES.md](./BENEFICIARY-PAGES.md) — الإفصاح السنوي، حصتي من الريع، التقارير المالية، الحسابات

### 🔧 واجهة الناظر
← [ADMIN-PAGES.md](./ADMIN-PAGES.md) — لوحة التحكم، الحسابات الختامية، التقارير، آلية الإقفال والأرشفة

### 📄 الصفحات العامة
- الصفحة الرئيسية (`/`)
- تسجيل الدخول (`/auth`)
- إعادة تعيين كلمة المرور (`/reset-password`)
- تثبيت التطبيق (`/install`)
- سياسة الخصوصية (`/privacy`)
- شروط الاستخدام (`/terms`)
- غير مصرح (`/unauthorized`)

---

## الأدوار والصلاحيات

| الدور | الوصف | الصلاحيات الرئيسية |
|-------|-------|-------------------|
| `admin` (ناظر) | مدير الوقف بصلاحيات كاملة | جميع الصفحات + إقفال السنة + إدارة المستخدمين + الإعدادات + ZATCA |
| `accountant` (محاسب) | محاسب بصلاحيات تشغيلية | جميع صفحات الناظر **عدا** إدارة المستخدمين والإعدادات وإقفال السنة المالية وتشخيص النظام وZATCA |
| `beneficiary` (مستفيد) | مستفيد من الوقف (عرض فقط) | الإفصاح، حصتي، التقارير، الحسابات، الترحيلات |
| `waqif` (واقف) | الواقف (عرض فقط) | العقارات، العقود، التقارير، الحسابات |

> **ملاحظة أمنية:** المحاسب يملك صلاحية القراءة والكتابة على البيانات المالية (الدخل، المصروفات، الحسابات) لكنه **لا يستطيع** إقفال السنة المالية أو الوصول لإعدادات النظام أو إدارة المستخدمين أو تشخيص النظام أو واجهة المستفيد.

---

## خريطة المسارات (43+ مسار)

### مسارات عامة (7)
| المسار | الوصف |
|--------|-------|
| `/` | الصفحة الرئيسية |
| `/auth` | تسجيل الدخول |
| `/reset-password` | إعادة تعيين كلمة المرور |
| `/install` | تثبيت التطبيق (PWA) |
| `/privacy` | سياسة الخصوصية |
| `/terms` | شروط الاستخدام |
| `/unauthorized` | صفحة عدم الصلاحية |

### مسارات الناظر والمحاسب (`/dashboard/*`) — 18+
| المسار | الأدوار | الوصف |
|--------|---------|-------|
| `/dashboard` | admin, accountant | لوحة التحكم الرئيسية |
| `/dashboard/properties` | admin, accountant | إدارة العقارات |
| `/dashboard/contracts` | admin, accountant | إدارة العقود |
| `/dashboard/income` | admin, accountant | إدارة الإيرادات |
| `/dashboard/expenses` | admin, accountant | إدارة المصروفات |
| `/dashboard/beneficiaries` | admin, accountant | إدارة المستفيدين |
| `/dashboard/accounts` | admin, accountant | الحسابات الختامية (الإقفال: admin فقط) |
| `/dashboard/reports` | admin, accountant | التقارير |
| `/dashboard/invoices` | admin, accountant | الفواتير والمستندات |
| `/dashboard/messages` | admin, accountant | الرسائل |
| `/dashboard/settings` | admin فقط | الإعدادات |
| `/dashboard/users` | admin فقط | إدارة المستخدمين |
| `/dashboard/audit-log` | admin, accountant | سجل المراجعة |
| `/dashboard/bylaws` | admin, accountant | اللائحة التنظيمية |
| `/dashboard/zatca` | admin فقط | إدارة ZATCA |
| `/dashboard/diagnostics` | admin فقط | تشخيص النظام |
| `/dashboard/support` | admin, accountant | الدعم الفني |
| `/dashboard/annual-report` | admin, accountant | التقرير السنوي |
| `/dashboard/chart-of-accounts` | admin, accountant | شجرة الحسابات |
| `/dashboard/comparison` | admin, accountant | المقارنة التاريخية |

### مسارات المستفيد والواقف (`/beneficiary/*`) — 15+
| المسار | الأدوار | الوصف |
|--------|---------|-------|
| `/beneficiary` | beneficiary | لوحة المستفيد |
| `/waqif` | waqif | لوحة الواقف |
| `/beneficiary/properties` | beneficiary, waqif | عرض العقارات |
| `/beneficiary/contracts` | beneficiary, waqif | عرض العقود |
| `/beneficiary/disclosure` | beneficiary | الإفصاح السنوي |
| `/beneficiary/my-share` | beneficiary | حصتي من الريع |
| `/beneficiary/carryforward` | admin, beneficiary, waqif | الترحيلات والخصومات |
| `/beneficiary/financial-reports` | beneficiary, waqif | التقارير المالية |
| `/beneficiary/accounts` | beneficiary, waqif | عرض الحسابات |
| `/beneficiary/invoices` | beneficiary, waqif | عرض الفواتير |
| `/beneficiary/messages` | beneficiary, waqif | المراسلات |
| `/beneficiary/notifications` | beneficiary, waqif | الإشعارات |
| `/beneficiary/bylaws` | beneficiary, waqif | اللائحة التنظيمية |
| `/beneficiary/settings` | beneficiary, waqif | الإعدادات الشخصية |
| `/beneficiary/support` | جميع الأدوار | الدعم الفني |
| `/beneficiary/annual-report` | beneficiary, waqif | التقرير السنوي |

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
| 2026-03-19 | تفعيل `strict: true` في `tsconfig.app.json` |
| 2026-03-19 | إصلاح تسريب PII في `usePrefetchAccounts` — تحويل لـ `beneficiaries_safe` |
| 2026-03-19 | إصلاح `getSession()` → `getUser()` في `useWebAuthn.ts` |
| 2026-03-19 | تحسين `logger.ts` — استخلاص رسائل الخطأ بشكل صحيح |
| 2026-02-27 | تعقيم `body.name` في `admin-manage-users` (create_user + bulk_create_users) |
| 2026-02-27 | إخفاء تفاصيل العقد عن المستفيدين في `cron_check_contract_expiry` |
| 2026-02-27 | دمج SELECT+UPDATE في `useUpdateAdvanceStatus` لمنع TOCTOU |
| 2026-02-27 | تعقيم رسائل خطأ WebAuthn و `generate-invoice-pdf` |
| 2026-02-27 | تقييد `fetchWaqfData` حسب الدور (AI Assistant) |
| 2026-02-27 | رفض طلب AI عند فشل جلب الدور (بدلاً من الافتراض كمستفيد) |
| 2026-02-20 | تشديد `log_access_event` — تقييد `anon` لأحداث login/signup فقط |
| 2026-02-20 | سحب صلاحيات `EXECUTE` من `anon`/`PUBLIC` للدوال الحساسة |
| 2026-02-20 | إزالة `unsafe-eval` من CSP |
| 2026-02-20 | تأمين `check-contract-expiry` بمصادقة مزدوجة (service_role + admin JWT) |

</div>