## خطة: إغلاق ثغرات aria-label + تقسيم وقائي + اختبارات ناقصة

سأتعامل مع الطلبات الأربعة معاً مع اختياراتي الافتراضية حيث تخطّى المستخدم الأسئلة.

### القرارات الافتراضية
- **نطاق aria-label**: كل `src/pages/**` + `src/components/diagnostics/**` + `src/components/layout/**` (الأشمل — يغطّي header/sidebar الحرجَين).
- **التقسيم الإضافي**: تقسيم آمن (هدف ≤150 سطر/ملف لإعطاء هامش ~25%).
- **الاختبار الثالث**: `useAccountsActions.test.ts` (الملف الثالث من السلسلة السابقة الذي لا يملك اختباراً)، مع إضافة `useAiChat.test.ts` بشكل أساسي أيضاً لاكتمال السلسلة.

---

### 1) فحص اشمل لـ aria-label + اختبارات إخفاء/إظهار

#### أ) تشديد الفحص في `src/lib/diagnostics/checks/interactions.ts`
- توسيع المسح ليشمل `src/components/diagnostics/**` و`src/components/layout/**` (حالياً pages فقط).
- إضافة فحص جديد `icon_link_no_aria`: عنصر `<Link>` يحتوي فقط `<Icon />` بلا `aria-label` ⇒ warn.

#### ب) إضافة aria-label لكل زر/أيقونة بلا تسمية
سأمسح المشروع وأضيف `aria-label` عربية معبّرة لكل:
- أزرار `size="icon"` بدون aria-label
- أزرار أيقونة-فقط (Icon child وحيد بدون نص)
- `IconButton`/Link حول أيقونة فقط

التغطية المتوقعة: ~10–20 زر بعد المسح (ChartOfAccountsPage و InvoicesPage و SystemDiagnosticsPage بالفعل صحيحة — سنفحص layout/diagnostics).

#### ج) اختبارات Vitest جديدة: `src/test/ariaLabelCoverage.test.ts`
- يستخدم `import.meta.glob` بـ `?raw` لقراءة كل ملفات `pages/**` و`components/{diagnostics,layout}/**`.
- يستخرج وسوم Button/IconButton عبر نفس parser المعتمد في interactions.ts.
- يفشل إن وُجد أي زر `size="icon"` بدون aria-label أو زر أيقونة-فقط بدون aria-label.
- اختبار ثانٍ: يُحاكي إخفاء/إظهار DropdownMenu في DiagnosticsToolbar (عبر `@testing-library/react`) ويتحقق:
  - عند `hasResults=false` ⇒ أزرار التصدير وإعادة الفحص محجوبة (`queryByRole('button', { name: /تصدير/ })` يعود null).
  - عند `hasResults=true` ⇒ تظهر مع aria-label الصحيح.

---

### 2) تقسيم وقائي للملفات الثلاث

#### `SystemDiagnosticsPage.tsx` (194 → ~120)
- استخراج جسم تبويب "checks" (التكرار على `allCategories` مع البطاقات والـ CheckRow) إلى:
  - `src/components/diagnostics/DiagnosticsChecksGrid.tsx` (~70 سطر)
- استخراج تبويب "overview" (NotificationFallbackCard + HealthSummaryCard + WebVitalsPanel) إلى:
  - `src/components/diagnostics/DiagnosticsOverviewTab.tsx` (~25 سطر)
- بقاء الصفحة كـ orchestrator نظيف.

#### `useAiChat.ts` (153 → ~90)
- استخراج إدارة الحالة الأساسية (open, messages, input, mode, error, refs) إلى:
  - `src/hooks/application/ai/useAiChatState.ts` (~50 سطر)
- يصبح `useAiChat.ts` غلافاً يجمع state + sendMessage + retryLast.

#### `useAccountsActions.ts` (152 → ~80)
- استخراج كل handler إلى ملف منفصل تحت `src/hooks/domain/financial/accountsActions/`:
  - `useCreateAccountAction.ts` (~30 سطر)
  - `useCloseFiscalYearAction.ts` (~40 سطر)
  - `useExportAccountsPdf.ts` (~40 سطر)
- `useAccountsActions.ts` يصبح composer يستدعي الثلاثة (~70 سطر).

#### حارس حجم آلي — اختبار CI جديد
`src/test/fileSizeBudget.test.ts`:
```ts
const BUDGET = { 'src/pages': 200, 'src/hooks': 180, 'src/components': 250 };
// يفشل إن تجاوز أي ملف ميزانيته بأكثر من -5% (≥190/171/237 يحذّر فقط)
```

---

### 3) ضمان صفر زر بدون معالج في الصفحات الثلاث
بعد التقسيم سأمرّر كل وسوم Button/Link في:
- `SystemDiagnosticsPage.tsx` + المكوّنات المستخرَجة الجديدة
- صفحات المستهلكة لـ `useAiChat` (AiChatPanel) و`useAccountsActions` (AccountsPage)

وأتحقّق أن كل `<Button>` لديه واحد من: `onClick`، `type="submit"`، `asChild` مع Link/Trigger، `disabled`. إن وُجد أي زر/تبويب بدون handler ⇒ أضيفه فوراً أو أحذف الزر إن كان زائداً.

اختبار توكيدي إضافي في `src/test/handlerCoverage.test.ts`: يطبّق نفس heuristic الموسّع على المسارات الثلاثة ويفشل إن وُجد أي تحذير.

---

### 4) اختبار وحدة للهوكين الناقصَين

#### `src/hooks/application/ai/useAiChatState.test.ts` (~40 سطر)
- يتحقق من القيم الابتدائية، `setOpen`، `closePanel` (يلغي abort)، `clearMessages`، `handleModeChange` (يصفّر الرسائل عند تغيير الوضع).

#### `src/hooks/domain/financial/accountsActions/useAccountsActions.test.ts` (~60 سطر)
- يَمُك `useCreateAccount` و`useCloseFiscalYear` عبر `vi.mock`.
- يتحقق:
  - `handleCreateAccount` يرفض بدون `selectedFY` ويستدعي toast خطأ.
  - `handleCloseYear` يرفض إن لم يكن `role === 'admin'`.
  - `handleCloseYear` يستدعي `closeFiscalYear.mutateAsync` بالـ payload الصحيح للنجاح.

---

### القيود والتحقق النهائي
- **محظور**: ملفات auth/Supabase المحمية، لا migrations، لا تعديل علامات إعدادات أمنية.
- **قيود تنسيق**: RTL، `hsl(var(--*))`، `logger`، حدود حجم 200/180.
- **بعد التنفيذ**:
  1. `bunx vitest run` ⇒ كل الاختبارات الجديدة خضراء.
  2. `/dashboard/diagnostics` ⇒ "أزرار بدون معالج" و"aria-label للأيقونات" و"حدود حجم الملفات" جميعها **pass**.
  3. لقطة شاشة سريعة عبر `browser--view_preview` للتأكد من سلامة التخطيط بعد التقسيم.
