

# وثيقة شاملة — كل ما هو مؤجّل أو غير مُنفَّذ أو جزئي

هذه الوثيقة تجمع **كل** بند مؤجّل أو معلّق من مصادر متعددة: الوثائق الرسمية (`FINAL-AUDIT-REPORT.md`, `INDEX.md`, `CHANGELOG.md`)، الكود المصدري، وتقارير الفحص الجنائي السابقة.

---

## القسم 1: مشاكل أمنية مؤجّلة (من FINAL-AUDIT-REPORT.md + الفحص الجنائي)

| # | المشكلة | التفاصيل | الأولوية | المصدر |
|---|---------|----------|---------|--------|
| 1 | `strictNullChecks: false` | يسمح بتمرير `null`/`undefined` بدون فحص — خطر حسابات مالية بـ `NaN` | **حرجة** | FINAL-AUDIT §مؤجلة |
| 2 | `noImplicitAny: false` | متغيرات بدون نوع تُعامَل كـ `any` — يُضعف أمان النوع | **عالية** | FINAL-AUDIT §مؤجلة |
| 3 | `strict: false` في `tsconfig.app.json` | تناقض مع `tsconfig.node.json` الذي يستخدم `strict: true` | **عالية** | FINAL-AUDIT §مؤجلة |
| 4 | CSP كـ `<meta>` لا تدعم `frame-ancestors` | يحتاج HTTP header عبر خادم وسيط | **متوسطة** | FINAL-AUDIT §مؤجلة |
| 5 | `unsafe-inline` في `style-src` | React/Vite يتطلب أنماط inline — يحتاج nonce-based CSP | **متوسطة** | FINAL-AUDIT §مؤجلة |
| 6 | `usePrefetchAccounts.ts` يقرأ من `beneficiaries` بدل `beneficiaries_safe` | يتجاوز تقنيع PII (national_id, bank_account) | **حرجة** | فحص جنائي صادق |
| 7 | `useWebAuthn.ts` يستخدم `getSession()` بدون `getUser()` (أسطر 41, 68) | يخالف المعيار الأمني المعتمد | **منخفضة** | فحص جنائي صادق |

---

## القسم 2: مشاكل أداء مؤجّلة

| # | المشكلة | الحل المقترح | الأولوية | المصدر |
|---|---------|-------------|---------|--------|
| 8 | `og-image.png` = 903KB | ضغط بـ WebP إلى ~80KB | **متوسطة** | FINAL-AUDIT §مؤجلة |
| 9 | كاش `StaleWhileRevalidate` = 30 يوم | تقليل إلى 7 أيام | **متوسطة** | FINAL-AUDIT §مؤجلة |
| 10 | `vite-plugin-pwa` في `dependencies` بدل `devDependencies` | نقلها يدوياً | **متوسطة** | FINAL-AUDIT §مؤجلة |
| 11 | لا يوجد cursor-based pagination | جميع الاستعلامات تستخدم `limit(500/1000)` — لن يتحمل نمو البيانات | **متوسطة** | فحص جنائي صادق |
| 12 | 17 ملف يستخدم `select('*')` بدل أعمدة محددة | يجلب بيانات غير ضرورية ويُثقل الشبكة | **منخفضة** | فحص جنائي صادق |

---

## القسم 3: مشاكل CI/CD مؤجّلة

| # | المشكلة | الحل المقترح | الأولوية | المصدر |
|---|---------|-------------|---------|--------|
| 13 | تناقض إصدار `package.json` مع `package-lock.json` | `npm install` ثم commit | **حرجة** | FINAL-AUDIT §مؤجلة |
| 14 | ملفا lock متعارضان (`package-lock.json` + `bun.lock`) | اختيار واحد وحذف الآخر | **عالية** | FINAL-AUDIT §مؤجلة |
| 15 | لا `coverage.thresholds` في vitest | إضافة حد أدنى 60% | **متوسطة** | FINAL-AUDIT §مؤجلة |
| 16 | `noUnusedLocals/Parameters: false` | تفعيل تدريجي | **متوسطة** | FINAL-AUDIT §مؤجلة |

---

## القسم 4: تحسينات ZATCA مؤجّلة

| # | المشكلة | الحل المقترح | الأولوية | المصدر |
|---|---------|-------------|---------|--------|
| 17 | `invoice_chain.invoice_id` بدون FK | إضافة FOREIGN KEY | **متوسطة** | FINAL-AUDIT §مؤجلة |
| 18 | `seller_name`/`seller_vat` hardcoded في الكود | نقلها لجدول `app_settings` | **متوسطة** | FINAL-AUDIT §مؤجلة |
| 19 | لا webhook callback من ZATCA | إضافة Edge Function لاستقبال نتائج ZATCA | **منخفضة** | FINAL-AUDIT §مؤجلة |

---

## القسم 5: تحسينات UX مؤجّلة

| # | التحسين | الأولوية | المصدر |
|---|---------|---------|--------|
| 20 | مقارنة سنة بسنة في KPI Dashboard | **متوسطة** | FINAL-AUDIT UX-1 |
| 21 | فلتر تحصيل العقود حسب الفترة | **منخفضة** | FINAL-AUDIT UX-2 |
| 22 | تصدير Excel بالإضافة لـ PDF | **متوسطة** | FINAL-AUDIT UX-3 |
| 23 | تصنيف الإشعارات (مالية / نظام / عقود) | **منخفضة** | FINAL-AUDIT UX-4 |

---

## القسم 6: ميزات مؤجّلة (من الجولة 17)

| # | الميزة | السبب | الأولوية | المصدر |
|---|--------|-------|---------|--------|
| 24 | حفظ محادثات AI في قاعدة البيانات | ميزة جديدة وليس خلل | **منخفضة** | FINAL-AUDIT MED-AI-1 |
| 25 | AiAssistant يُحمَّل لجميع الأدوار | تحسين أداء — تحميل مشروط حسب الدور | **منخفضة** | FINAL-AUDIT INFO-AI-1 |
| 26 | مسارا ZATCA/Support غير موثقَّين في INDEX.md | توثيق فقط | **منخفضة** | FINAL-AUDIT INFO-APP-1 |

---

## القسم 7: أخطاء حقيقية مكتشفة بالفحص الجنائي (لم تُصلح بعد)

| # | المشكلة | التفاصيل | الأولوية | المصدر |
|---|---------|----------|---------|--------|
| 27 | خطوط PDF العربية تفشل | 21 خطأ `Failed to load Arabic fonts for PDF` في 7 أيام | **عالية** | access_log |
| 28 | `logger.ts` يُسجّل رسائل فارغة | `args[0]` قد يكون `Error` object — ينتج `message: ""` (299 سجل فارغ) | **عالية** | access_log |
| 29 | `useAuth outside AuthProvider` | 14 خطأ — مكوّن يُستدعى خارج AuthProvider | **متوسطة** | access_log |
| 30 | `removeChild on Node` | 4 أخطاء DOM — تعارض React مع عنصر محذوف | **منخفضة** | access_log |

---

## القسم 8: ديون تقنية (Code Debt)

| # | المشكلة | التفاصيل | الأولوية |
|---|---------|----------|---------|
| 31 | تكرار منطق إعدادات الصوت/الإشعارات | `BeneficiarySettingsPage.tsx` و `SettingsPage.tsx` يحتويان نفس المنطق — يحتاج hook مشترك `useNotificationPreferences` | **منخفضة** |
| 32 | `as any` / `as unknown` في 43 ملف | 397 استخدام — أغلبها في الاختبارات (مقبول) لكن بعضها في كود الإنتاج | **منخفضة** |
| 33 | `select('*')` في `usePrefetchAccounts` على `beneficiaries` | يتجاوز `beneficiaries_safe` ويجلب PII غير مقنّع | **حرجة** (مكرر مع #6) |

---

## القسم 9: تحديث الوثائق المطلوب

| # | الملف | ما يحتاج تحديث |
|---|-------|----------------|
| 34 | `INDEX.md` | عدد الجداول = 37 (مكتوب 28)، Edge Functions = 12 (مكتوب 9)، الدوال = 32+ (تحتاج مراجعة) |
| 35 | `INDEX.md` | المسارات = 39+ صفحة (مكتوب 27 مسار) — ينقصها: `/install`, `/reset-password`, `/waqif`, `/dashboard/zatca`, `/dashboard/support`, `/dashboard/annual-report`, `/dashboard/chart-of-accounts`, `/dashboard/comparison`, `/beneficiary/annual-report`, `/beneficiary/support` |
| 36 | `INDEX.md` | تاريخ آخر تحديث = 2026-03-02 (قديم بـ 17 يوم) |
| 37 | `CHANGELOG.md` | لا يتضمن أي تحديثات بعد 2026-03-02 رغم تنفيذ عشرات الإصلاحات |
| 38 | `FINAL-AUDIT-REPORT.md` | التقييم 92-93% لكن لا يعكس الإصلاحات الأخيرة (UI responsiveness, charts, AccessLogTab, ArchiveLogTab) |

---

## ملخص إحصائي

```text
┌──────────────────────────────────┬───────┐
│ الفئة                            │ العدد │
├──────────────────────────────────┼───────┤
│ مشاكل أمنية مؤجّلة              │   7   │
│ مشاكل أداء مؤجّلة               │   5   │
│ مشاكل CI/CD مؤجّلة              │   4   │
│ تحسينات ZATCA مؤجّلة            │   3   │
│ تحسينات UX مؤجّلة               │   4   │
│ ميزات جديدة مؤجّلة              │   3   │
│ أخطاء حقيقية غير مُصلحة         │   4   │
│ ديون تقنية                      │   3   │
│ وثائق تحتاج تحديث               │   5   │
├──────────────────────────────────┼───────┤
│ الإجمالي                         │  38   │
│ منها حرجة (يجب إصلاحها)          │   4   │
│ منها عالية                       │   6   │
│ منها متوسطة                      │  15   │
│ منها منخفضة                      │  13   │
└──────────────────────────────────┴───────┘
```

---

## خطة التنفيذ المقترحة (حسب الأولوية)

### المرحلة 1 — حرجة (4 بنود)
1. `usePrefetchAccounts.ts`: تغيير `beneficiaries` → `beneficiaries_safe`
2. `logger.ts`: تحسين استخلاص الرسالة (`errObj?.message || args[0]`)
3. `strictNullChecks`: تفعيل تدريجي مع إصلاح الأخطاء
4. تناقض إصدارات `package.json` / lock files

### المرحلة 2 — عالية (6 بنود)
5. تشخيص فشل خطوط PDF العربية
6. `noImplicitAny` + `strict` في tsconfig
7. حذف ملف lock المتعارض
8. `useAuth outside AuthProvider` — تحقق من lazy loading
9. `og-image.png` ضغط لـ WebP
10. تحديث الوثائق (`INDEX.md`, `CHANGELOG.md`, `FINAL-AUDIT-REPORT.md`)

### المرحلة 3 — متوسطة ومنخفضة (البقية)
11-38. باقي البنود حسب الأولوية

