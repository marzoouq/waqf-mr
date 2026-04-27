
# تقرير المراجعة المعمارية — نظام إدارة وقف مرزوق بن علي الثبيتي

تقرير قراءة فقط — لم يُعدَّل أي كود. المرجع المعتمَد: `mem://technical/architecture/core-modularization-standard-v7`.

---

## 1. الحكم العام

البنية المعمارية **قوية ومتسقة بشكل ملحوظ**. التوثيق في `src/hooks/README.md`, `src/lib/README.md`, `src/utils/README.md` يصف معايير v7 الطبقية، والكود يتبعها بدرجة عالية:

- **0** ملف في `src/components/` يستورد `supabase` مباشرة.
- **0** ملف في `src/pages/` يستورد `supabase` مباشرة.
- **0** ملف في `src/utils/` يستورد `supabase` أو `sonner` خارج ملفات الاختبار.
- **0** تبعية عكسية: `hooks/data` و`hooks/financial` لا تستوردان من `hooks/page`.
- **4 فقط** استدعاءات `console.*` في الكود غير الاختباري كلها داخل `lib/logger.ts` و`ErrorBoundary` (مشروعة).
- **0** TODO/FIXME/HACK في `src/`.
- جميع الصفحات في `src/pages/` تقريباً **logic-less**: تستدعي page hook واحدة وتعرض مكوّناتها. الاستثناء الوحيد ذو حالة محلية هو `EmailMonitorPage`.

أداء معماري ممتاز نسبة لمشروع يحوي ~1000 ملف TS/TSX و11 Edge Function. التوصيات أدناه **تحسينات هامشية**، لا إصلاحات هيكلية.

---

## 2. النتائج المحددة (مرتبة حسب الأولوية)

### P1 — مشكلات تستحق التنفيذ القريب

**P1.1 تكرار `generateZatcaQrTLV` في ثلاث مواضع**
- `supabase/functions/zatca-signer/qr-tlv.ts` — المصدر الرسمي (مُصدَّر).
- `supabase/functions/generate-invoice-pdf/index.ts:102` — نسخة محلية مكتوبة يدوياً.
- `supabase/functions/zatca-signer/index.test.ts:89` — نسخة ثالثة داخل ملف الاختبار.

الخطر: انجراف منطقي إذا تغيّر تنسيق ZATCA QR في إحدى النسخ دون الأخريات. الحل: نقل النسخة إلى `_shared/zatca-qr-tlv.ts` واستهلاكها من الثلاثة.

**P1.2 ملف اختبار يتيم: `_shared/ecdsa-signing.test.ts`**
لا يوجد `ecdsa-signing.ts` مقابل. الملف يختبر منطق توقيع ECDSA باستخدام `crypto.subtle.sign` + `c14n` لكن دون مصدر مستقل، ويكرر منطقاً موزعاً في `zatca-signer/index.ts`.
- الخيار (أ): استخراج helpers التوقيع إلى `_shared/ecdsa-signing.ts` ليصبح الاختبار صالحاً.
- الخيار (ب): حذف الاختبار اليتيم. (أ) أفضل للاختبارية.

**P1.3 `EmailMonitorPage` يحوي `useState` محلية**
سطر `const [showCustom, setShowCustom] = useState(false)` في الصفحة (المرشد v7: الصفحات logic-less). نقله إلى `useEmailMonitorPage` يحافظ على الاتساق مع 36 صفحة أخرى.

**P1.4 منطق بناء CSV داخل `AccountsPage.tsx`**
دالة `handleExportCsv` تبني صفّاً من 11 حقلاً ذي دلالة عربية محددة — منطق تصدير ينتمي إلى `useAccountsPage` أو إلى `utils/export/accountsCsv.ts`. تستحق المراجعة في `HistoricalComparisonPage` و`AnnualReportPage` بنفس المعيار.

---

### P2 — تحسينات صحة الأنواع

**P2.1 ~77 استخدام `: any` في الكود**
عدد منخفض نسبياً، لكنه يستحق المسح والاستبدال بأنواع مولدة من `src/integrations/supabase/types.ts` أو generics في `useCrudFactory`. التركيز على ملفات `hooks/data/*` لأنها سطح API الداخلي.

**P2.2 توحيد أنواع التقارير المالية**
حقل `zakat_amount` معاد تعريفه في 7 ملفات (P4 من خطة سابقة). لا يزال صالحاً — استخراج interface `FinancialSummary` موحَّدة في `src/types/financial.ts`.

---

### P3 — حجم الملفات وتفكيكها

ولا ملف يتجاوز 300 سطر في `src/` (باستثناء `types.ts` المولّد آلياً، 2425 سطر — لا يُعدَّل). أكبر ملفات الواجهة مقبولة.

**Edge Functions** أكبر بطبيعتها:

| Function | الأسطر | تعليق |
|---------|-------|------|
| `generate-invoice-pdf/index.ts` | 591 | **مرشّح للتفكيك**: استخراج QR إلى `_shared`، رسم PDF إلى `pdf-renderer.ts`، ترك `index.ts` كموجِّه HTTP فقط. |
| `admin-manage-users/index.ts` | 491 | **مرشّح للتفكيك**: فصل عمليات CRUD/الأدوار في handlers منفصلة. |
| `process-email-queue/index.ts` | 363 | حديث، مقبول الآن. مراقبة عند نمو القوالب. |
| `webauthn/index.ts` | 346 | حساس أمنياً — يفضّل تقسيمه إلى `register/`, `authenticate/`, `verify/` handlers مع اختبارات لكل مسار. |

---

### P4 — تنظيم الـ Barrels والاستيراد

42 ملف `index.ts` في `src/`. الإحصاءات تُظهر استخداماً صحياً:
- `@/components/layout` و`@/components/common` يُستهلكان من 39 موقعاً لكل منهما.
- بقية الـ barrels مستهلكة 1–7 مرات (مفيدة، لا إفراط).

ذاكرة `barrel-import-rule` تنص: لا يستورد barrel من barrel. لم أرصد انتهاكاً واضحاً — يستحق فحصاً سريعاً عبر سكربت في خطوة لاحقة.

---

### P5 — اقتراحات اختيارية

- مجلد `src/pages/dashboard/` يحوي 18 صفحة + اختبارات، مسطّحة. التقسيم إلى `dashboard/admin/`, `dashboard/finance/`, `dashboard/management/` يطابق ما هو موجود أصلاً في `hooks/page/admin/{financial,management,…}`.
- `src/components/common/` يحوي 34 ملفاً مسطّحاً. يمكن تجميعهم في `common/banners/`, `common/skeletons/`, `common/pagination/`.
- إضافة قواعد ESLint مخصّصة لمنع: `console.*` خارج logger، `useState` في `pages/`، `: any` صريح.

---

## 3. خطة التنفيذ المقترحة (مرتبة)

| # | الإجراء | التأثير | الجهد | الخطر |
|---|--------|--------|------|------|
| 1 | استخراج `generateZatcaQrTLV` إلى `_shared/zatca-qr-tlv.ts` واستهلاكه من الثلاثة | عالٍ (اتساق ZATCA) | 15 دق | منخفض |
| 2 | حلّ ملف `ecdsa-signing.test.ts` اليتيم: استخراج المصدر أو حذف الاختبار | متوسط | 30 دق | منخفض |
| 3 | نقل `useState` المحلية في `EmailMonitorPage` إلى `useEmailMonitorPage` | منخفض (اتساق) | 5 دق | منخفض جداً |
| 4 | نقل `handleExportCsv` (وأمثاله في صفحات تقارير) إلى hook الصفحة أو `utils/export/` | متوسط | 20 دق/صفحة | منخفض |
| 5 | تفكيك `generate-invoice-pdf/index.ts` (591 سطر) إلى handler + renderer + qr | متوسط–عالٍ | 1 سا | متوسط |
| 6 | تفكيك `admin-manage-users/index.ts` (491 سطر) إلى handlers | متوسط | 1 سا | متوسط |
| 7 | تفكيك `webauthn/index.ts` (346 سطر) — حساس أمنياً | متوسط | 1.5 سا | متوسط–عالٍ |
| 8 | استخراج `FinancialSummary` نوع موحَّد في `src/types/financial.ts` | متوسط (DX) | 45 دق | منخفض |
| 9 | كنس `: any` في `hooks/data/*` (≈30 موقع) واستبدالها بأنواع مولّدة | متوسط (سلامة الأنواع) | 1 سا | منخفض |
| 10 | إعادة تنظيم `pages/dashboard/` و`components/common/` بمجلدات فرعية | منخفض (تنظيمي) | 1 سا | متوسط (يكسر الاستيرادات) |
| 11 | إضافة قواعد ESLint مخصّصة (no-console، no-useState-in-pages، no-explicit-any) | منخفض–متوسط | 30 دق | منخفض جداً |

**التوصية:** البدء بالبنود 1–4 (أثر مرتفع/جهد منخفض) في جلسة واحدة، ثم 5–7 كل جلسة على حدة لأنها تمسّ Edge Functions حرجة وتتطلب اختباراً مستقلاً.

---

## 4. نقاط قوة موثّقة

- فصل واضح بين `lib/` (بنية تحتية ذات حالة) و`utils/` (دوال نقية) — ملتزم به.
- جميع الجداول في `supabase/migrations/` تستخدم RLS — مطابق لـ `<user-roles>`.
- `verify_jwt = false` مقصود ومُستخدَم مع `getUser()` يدوي في كل Edge Function.
- اختبارات موطّنة بجوار الكود — سهولة صيانة عالية.
- لا استخدام لـ `localStorage` لأدوار المستخدمين.

---

## 5. تأكيد القراءة فقط

لم تُكتَب أو تُعدَّل أو تُحذَف أي ملفات أثناء هذه المراجعة. عند موافقتك سأنتقل إلى وضع البناء وأنفّذ البنود المطلوبة (يفضّل البدء بـ P1.1 → P1.4 كحزمة أولى).
