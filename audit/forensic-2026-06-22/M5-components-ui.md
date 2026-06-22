# M5 — تقرير الفحص الجنائي لمكونات UI
**التاريخ:** 2026-06-22  
**النطاق:** `src/components/` · `src/pages/`  
**المحقق:** Explore Agent (read-only)

---

## 1. ألوان HEX الخام وكلاسات ألوان مُشفَّرة مباشرة

| # | الملف | السطر | القيمة | الخطورة |
|---|-------|-------|--------|---------|
| 1 | `src/components/expenses/vouchers/SignaturePad.tsx` | 26 | `ctx.fillStyle = '#ffffff'` | منخفض — Canvas API، لا بديل بـ token |
| 2 | `src/components/expenses/vouchers/SignaturePad.tsx` | 61 | `ctx.strokeStyle = '#0f172a'` | متوسط — لون خام بدلاً من `hsl(var(--foreground))` |
| 3 | `src/components/expenses/vouchers/SignaturePad.tsx` | 91 | `ctx.fillStyle = '#ffffff'` | منخفض — تكرار |
| 4 | `src/components/invoices/InvoicePreviewDialog.tsx` | 16 | `CANVAS_BG_COLOR = '#ffffff'` | منخفض — ثابت Canvas |
| 5 | `src/components/landing/LandingHero.tsx` | 54، 57، 60، 82، 93 | `text-white`، `text-white/90`، `text-white/70` | منخفض — مقبول فوق صورة خلفية داكنة |
| 6 | `src/components/ui/alert-dialog.tsx` | 19 | `bg-black/80` | منخفض — shadcn overlay قياسي |
| 7 | `src/components/ui/dialog.tsx` | 23 | `bg-black/80` | منخفض — shadcn overlay قياسي |

**المجموع:** 7 حالات. أخطر حالة: `#0f172a` في SignaturePad (يكسر Dark Mode).

---

## 2. أطول 20 ملف TSX (سطراً)

| # | الملف | عدد الأسطر |
|---|-------|------------|
| 1 | `src/components/ui/native-select-dialog.integration.test.tsx` | 239 |
| 2 | `src/pages/dashboard/AnnualReportPage.tsx` | 196 |
| 3 | `src/pages/dashboard/DistributionsPage.tsx` | 190 |
| 4 | `src/pages/beneficiary/MySharePage.tsx` | 189 |
| 5 | `src/pages/dashboard/ReportsPage.tsx` | 187 |
| 6 | `src/components/invoices/InvoiceGridView.tsx` | 186 |
| 7 | `src/components/beneficiary/my-share/AdvanceRequestDialog.tsx` | 186 |
| 8 | `src/components/reports/ZakatEstimationReport.tsx` | 185 |
| 9 | `src/pages/dashboard/AccountsPage.tsx` | 183 |
| 10 | `src/components/settings/zatca/ZatcaFormCards.tsx` | 182 |
| 11 | `src/components/accounts/DistributeDialog.tsx` | 182 |
| 12 | `src/components/invoices/CreateInvoiceFromTemplate.tsx` | 181 |
| 13 | `src/components/accounts/AccountsSummaryCards.tsx` | 181 |
| 14 | `src/components/expenses/vouchers/VoucherList.tsx` | 180 |
| 15 | `src/pages/dashboard/InvoicesPage.tsx` | 179 |
| 16 | `src/pages/ResetPassword.test.tsx` | 179 |
| 17 | `src/components/ui/dropdown-menu.tsx` | 179 |
| 18 | `src/components/layout/DashboardLayout.tsx` | 177 |
| 19 | `src/components/dashboard/AiAssistant.tsx` | 177 |
| 20 | `src/pages/dashboard/HistoricalComparisonPage.tsx` | 176 |

> **ملاحظة:** لا يوجد ملف يتجاوز 200 سطر (باستثناء ملف الاختبار #1). الكود منضبط الحجم.

---

## 3. مكونات تستدعي Supabase وتعرض UI مباشرة

لا يوجد **import مباشر** لـ `supabase` client داخل ملفات `.tsx` للمكونات أو الصفحات.  
جميع طلبات البيانات تمر عبر **custom hooks** (مسار `src/hooks/`) أو **TanStack Query** — وهو نمط صحيح يفصل layer البيانات عن layer العرض.

| حالة | النتيجة |
|------|---------|
| import مباشر لـ supabase في components/*.tsx | ✅ لا يوجد |
| import مباشر لـ supabase في pages/*.tsx | ✅ لا يوجد |

---

## 4. صفحات/مكونات بأكثر من H1 واحد

| الملف | عدد H1 | ملاحظة |
|-------|--------|--------|
| `src/components/common/feedback/ErrorBoundary.tsx` | 2 | السطران 95، 114 — حالتا عرض منفصلتان (update vs error)، لكن كلاهما داخل نفس المكوّن |

> باقي الملفات: كل ملف يحتوي H1 واحد فقط أو لا يحتوي أياً.  
> `ErrorBoundary` مقبول تقنياً لكنه يُولّد تحذير accessibility إذا ظهرت الحالتان في DOM معاً في سياقات نادرة.

---

## 5. صور `<img>` بدون `alt`

| حالة | النتيجة |
|------|---------|
| img بدون alt في components/*.tsx | ✅ لا يوجد |
| img بدون alt في pages/*.tsx | ✅ لا يوجد |

جميع صور `<img>` الـ 11 موجودة في الكود تحتوي على `alt` مناسب (عربي في الغالب).  
**استثناء واحد مقصود:** splash screen في `index.html` يستخدم `alt=""` (decorative) — صحيح أكسيسبيليتي.

---

## 6. `dir="rtl"` و `lang="ar"` في index.html

| الخاصية | القيمة | السطر |
|---------|--------|-------|
| `lang` | `"ar"` | `<html lang="ar" dir="rtl">` (سطر 1) |
| `dir` | `"rtl"` | نفس الوسم |
| `body` inline style | `direction:rtl` | داخل `<style>` الـ critical CSS |

✅ **مكتمل** — كلاهما موجودان في `<html>` مع دعم inline للسرعة.

---

## 7. Tabs غير مكتملة (Triggers ≠ Contents)

| الملف | Triggers | Contents | مشكلة |
|-------|----------|----------|--------|
| `src/pages/dashboard/InvoicesPage.tsx` | 3 | **0** | ⚠️ يستخدم Tabs كـ filter بصري فقط بدون TabsContent |
| `src/pages/beneficiary/InvoicesViewPage.tsx` | 3 | **0** | ⚠️ نفس النمط — Tabs بدون content panels |
| `src/pages/beneficiary/AnnualReportViewPage.tsx` | 4 | 5 | ⚠️ محتوى إضافي (5 > 4)، الخامس داخل `map()` |
| `src/pages/dashboard/AnnualReportPage.tsx` | 4 | 4 | ✅ متوازن |
| `src/pages/dashboard/SystemDiagnosticsPage.tsx` | 7 | 7 (بعد الفحص 8→7) | ✅ متوازن |
| `src/pages/dashboard/ZatcaManagementPage.tsx` | 3 | 3 | ✅ متوازن |
| `src/pages/dashboard/SupportDashboardPage.tsx` | 3 | 3 | ✅ متوازن |
| `src/pages/dashboard/ReportsPage.tsx` | 7 (via ResponsiveTabs config) | 7 (TabsContent) | ✅ متوازن |
| `src/components/dashboard/AiAssistant.tsx` | 0 | 1 | ⚠️ TabsContent بدون trigger مرئي |

> **InvoicesPage / InvoicesViewPage:** نمط متعمَّد — يُستخدم `<Tabs>` كـ segmented control بصري مع `onValueChange` يُحدّث filter في الـ state، لا يُبدّل محتوى. غير خاطئ وظيفياً لكنه غير دلالي (يُضلل screen readers).

---

## 8. `useEffect` بدون cleanup للاشتراكات

| الملف | السطر | الاشتراك | هل يوجد cleanup؟ |
|-------|-------|---------|-----------------|
| `src/components/common/feedback/OfflineBanner.tsx` | 10–17 | `addEventListener('offline')` + `('online')` | ✅ نعم — `removeEventListener` في return |
| `src/components/common/layout/PrintHeader.tsx` | 7–10 | `addEventListener('beforeprint')` | ✅ نعم — `removeEventListener` في return |
| `src/components/diagnostics/AuditModeOverlay.tsx` | 25–29 | `setInterval` | ✅ نعم — `clearInterval` في return |
| `src/components/diagnostics/NotificationFallbackCard.tsx` | 35–41 | `setInterval` (polling) | ✅ نعم — `clearInterval` في return |
| `src/components/diagnostics/NotificationFallbackCard.tsx` | 45–47 | `setInterval` (ثانٍ) | ✅ نعم — `clearInterval` في return |

✅ **جميع الاشتراكات تمتلك cleanup function** — لا توجد memory leaks محددة.

---

## ملخص تنفيذي

| المحور | الوضع | عدد المشاكل |
|--------|-------|------------|
| ألوان HEX خام | ⚠️ جزئي | 7 (1 مهم: strokeStyle داكن) |
| ملفات طويلة >200 سطر | ✅ لا يوجد | 0 (إنتاج) |
| Supabase في UI مباشرة | ✅ نظيف | 0 |
| H1 متعددة في صفحة | ⚠️ جزئي | 1 (ErrorBoundary) |
| img بدون alt | ✅ نظيف | 0 |
| dir/lang في index.html | ✅ مكتمل | — |
| Tabs غير متوازنة | ⚠️ جزئي | 3 حالات |
| useEffect بدون cleanup | ✅ نظيف | 0 |

### أولويات الإصلاح
1. **HIGH:** `SignaturePad.tsx:61` — استبدال `#0f172a` بـ CSS custom property لدعم Dark Mode
2. **MED:** `InvoicesPage` و `InvoicesViewPage` — إضافة `role="tablist"` أو تحويل إلى `ToggleGroup` لوضوح الدلالة
3. **LOW:** `ErrorBoundary.tsx` — إضافة `role="alert"` بدلاً من `<h1>` لتجنب تعدد الـ landmarks

