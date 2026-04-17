

## اعتراف بالخطأ + خطة مُصحَّحة

### تصحيحات جنائية لإجابتي السابقة

| ادعائي السابق | الواقع المُتحقَّق | الحالة |
|---|---|---|
| المشروع Tailwind v3 | `index.css:1` فيه `@import "tailwindcss"` و `@theme {}` و `@plugin` — هذا **Tailwind v4 صراحة** | ❌ كنت مخطئاً |
| `useUnreadMessages` غير موجود في `useLayoutState` | موجود فعلاً في السطر 12 + 60 | ❌ كنت مخطئاً |
| `STATUS_MAP` مكرر | مؤكد: مُعرَّف في `supportConstants.ts` **و** `useSupportDashboardPage.ts` (سطور 14-30) و `TicketDetailDialog.tsx` يستورد من الـ hook | ✅ صحيح |
| ألوان hardcoded في PDF | مؤكد: 14 ملف فيها `setDrawColor(22, 101, 52)` و `setFillColor(202, 138, 4)` | ✅ صحيح |
| `LandingPageContent` في مكوّن settings | مؤكد: `LandingPageTab.tsx:15` + 5 ملفات تستورد من `@/components/settings` | ✅ صحيح |
| `tailwind.config.ts` فيه ألوان ثابتة | مؤكد: السطر 19-99 كله hardcoded `hsl(...)` | ✅ صحيح |

**الخلاصة:** التقرير الجنائي للمستخدم دقيق. خطتي السابقة كانت متحفظة بشكل غير مبرر.

---

## الموجة 1 — حرج

### 1.1 توحيد نظام الألوان (Tailwind v4)
- في `tailwind.config.ts`: استبدال **كل** قيم `hsl(N N% N%)` الـ22 بـ `hsl(var(--token))`
- توسيع `ThemeVars` في `themeDefinitions.ts` لتشمل: `background`, `foreground`, `card-foreground`, `popover`, `popover-foreground`, `secondary-foreground`, `destructive`, `destructive-foreground`, `sidebar-foreground`, `sidebar-primary-foreground`, `sidebar-accent-foreground`, `success-foreground`, `success-muted`, `warning-foreground`, إلخ (حسب ما هو موجود في `index.css`)
- توسيع الثيمات الخمسة (`islamicGreen/royalBlue/purple/navy/maroon`) لتوفر هذه القيم في `light` و `dark`
- **النتيجة:** تبديل الثيم يعكس الواجهة بأكملها (utilities + components)

### 1.2 توحيد ثوابت الدعم
- إنشاء `src/constants/support.ts` (نسخة موحدة من `STATUS_MAP/PRIORITY_MAP/CATEGORY_MAP/SLA_HOURS` + `Icon`)
- حذف التكرار من `useSupportDashboardPage.ts` (سطور 14-30)
- حذف `src/components/support/supportConstants.ts` (مع نقل المحتوى)
- تحديث 4 مستوردين: `TicketList`, `SupportTicketsTab`, `TicketDetailDialog`, `useSupportDashboardPage.test.ts`

### 1.3 فصل `useLayoutState`
- إنشاء `src/hooks/auth/useLogoutFlow.ts` يستوعب `handleSignOut` + `logAccessEvent` + `navigate('/auth')`
- إبقاء `useLayoutState` للـ UI فقط (sidebar/swipe/dialogs)
- العقد الخارجي (return shape) **يبقى نفسه** — صفر تأثير على المستهلكين

---

## الموجة 2 — عالي

### 2.1 ألوان PDF موحدة عبر `themeColors`
- إنشاء `src/utils/pdf/core/themeColors.ts` بدالة `getPdfThemeColors()` تقرأ `getComputedStyle(document.documentElement).getPropertyValue('--primary')` ثم تُحوِّل HSL→RGB
- تمرير `colors` كـ parameter اختياري للملفات السبعة المتأثرة (مع fallback للقيم الحالية للتوافق العكسي)
- استبدال `GOLD_PATTERN_COLOR` في `LandingHero.tsx` بـ `style={{ color: 'hsl(var(--secondary))' }}`

### 2.2 نقل `LandingPageContent` type
- إنشاء `src/types/landing.ts` ونقل الـ interface
- تحديث 6 مستوردين: `Index.tsx`, `LandingPageTab`, `LandingHero`, `LandingFeatures`, `LandingCTA`, `LandingFooter`, `components/settings/index.ts`

### 2.3 تنظيف `Index.tsx`
- إزالة `useMemo, useCallback` غير المستخدمين من السطر 6 (سأفحص استخدامهما الفعلي قبل الحذف)

---

## الموجة 3 — متوسط (يُنفَّذ بعد التحقق من الموجتين 1+2)

### 3.1 توحيد `BottomNav`
- استبدال 4 مصفوفات hardcoded باستخدام `useNavLinks()` مع تصفية بأول N روابط حسب الدور

### 3.2 فلتر صلاحيات مشترك
- `src/lib/permissions/filterByVisibility.ts` — استخراج المنطق المشترك بين `useNavLinks` و `usePermissionCheck`

---

## الموجة 4 — اختياري (مؤجَّل، لا يُنفَّذ الآن)

- 4.1 تقسيم `index.css` (593 سطر) إلى ملفات `base/gradients/print/animations`
- 4.2 جعل `/privacy` و `/terms` قابلة للتخصيص عبر `LandingPageContent`

---

## استراتيجية التحقق بعد كل موجة

- `tsc --noEmit` + `vite build`
- بعد الموجة 1: تبديل الثيمات الخمسة يدوياً + تأكيد تأثُّر الـ utilities (`bg-primary`, `text-foreground`, `border-border`)
- بعد الموجة 2: توليد فاتورة PDF واحدة + تأكيد ألوان الثيم النشط
- بعد الموجة 3: فحص `BottomNav` لكل دور (admin/accountant/beneficiary/waqif)

## الملفات المتأثرة (تقدير دقيق)

**الموجة 1:** ~12 ملف معدّل + 2 جديد + 1 محذوف
**الموجة 2:** ~10 ملفات معدّلة + 2 جديد
**الموجة 3:** ~3 ملفات معدّلة + 1 جديد

## الضمانات

- صفر تعديل على `AuthContext`, `ProtectedRoute`, `SecurityGuard`
- صفر تعديل على قاعدة البيانات، RLS، Edge Functions
- صفر تعديل على `client.ts`, `types.ts`, `.env`, `config.toml`
- العقود الخارجية للـ hooks تبقى ثابتة

## السؤال الوحيد قبل البدء

نبدأ بالموجة 1 كاملة (الأعلى أثراً، يصلح جذر مشكلة الثيمات)، أم تفضّل الموجة 1.2 + 1.3 فقط أولاً (الأقل مخاطرة بصرية) ثم 1.1 منفصلة؟

