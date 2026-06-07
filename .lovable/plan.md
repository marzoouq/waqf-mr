## خطة معالجة تحذيرات صفحة التشخيص

بعد فحص الملفات الفعلية تبيّن أن **أزرار بدون معالج** و **aria-label للأيقونات** هي بالكامل تقريباً **نتائج إيجابية كاذبة** من heuristic ضعيف في `src/lib/diagnostics/checks/interactions.ts`، إضافة إلى نمط `<Link><Button>` غير المثالي. سنُصلح الـ heuristic + نُحدّث الأنماط + نُقلّص الملفات الثلاثة التي تتجاوز الحد.

### السبب الجذري للتحذيرات

1. **regex للـ Button معطوب**: `/<Button\b[^>]*>/g` يتوقف عند أول `>`، وعندما يحتوي الـ onClick على `=>` يُقطع الوسم ويُفقد `aria-label` التالي.
   - النتيجة: 3 أزرار أيقونة (`ChartOfAccountsPage`, `InvoicesPage`, `SystemDiagnosticsPage`) تملك `aria-label` فعلياً لكنها تُبلَّغ ناقصة.

2. **لا فحص للأب**: الـ heuristic لا يرى أن الزر داخل `<Link>` أو `<DropdownMenuTrigger asChild>`.
   - النتيجة: 4 أزرار "بدون معالج" في `NotFound`, `Unauthorized`, `SystemDiagnosticsPage` (داخل Link أو asChild).

### التعديلات

#### 1) إصلاح `src/lib/diagnostics/checks/interactions.ts` (~30 سطر مضاف)
- استبدال regex استخراج الـ Button بمحلّل يتعامل مع `{...}` و`=>` داخل السمات (يعدّ الأقواس المتوازنة حتى يصل إلى `>` خارج أي `{...}` أو `"..."`).
- اعتبار الزر **مُعالَجاً** إذا كان السطر السابق المباشر يحتوي على `<Link` أو `asChild` (يغطّي DropdownMenuTrigger/AlertDialogTrigger/PopoverTrigger).
- إعادة بناء `cachedRows` (إفراغ الكاش) ليُعاد المسح من جديد.

#### 2) تحسين الأنماط في الصفحات (تطبيق idiomatic shadcn)
- **`src/pages/NotFound.tsx`**: تحويل `<Link to="/"><Button>...</Button></Link>` × 2 إلى `<Button asChild><Link to="/">...</Link></Button>`.
- **`src/pages/Unauthorized.tsx`**: نفس التحويل مرة واحدة.

(زر `SystemDiagnosticsPage` السطر 112 صحيح بالفعل — سيُصبح pass بعد إصلاح الـ heuristic.)

#### 3) تقليص الملفات المتجاوزة للحد

**`src/pages/dashboard/SystemDiagnosticsPage.tsx`** (249 → ≤200)
- استخراج شريط الأدوات (Export DropdownMenu + Rerun DropdownMenu + Clean DropdownMenu + AlertDialog الخفيف + DeepCleanConfirmDialog) إلى مكوّن جديد:
  - `src/components/diagnostics/DiagnosticsToolbar.tsx` (~110 سطر)
- يستقبل props: `{ summary, running, deepCleaning, results, exportJson, exportText, rerunFailures, rerunFailuresAndWarnings, handleLightClean, handleDeepClean, cleanDialog, setCleanDialog }`.

**`src/hooks/application/useAiChat.ts`** (197 → ≤180)
- استخراج دالة streaming الفعلية (قراءة SSE من Edge Function) إلى:
  - `src/lib/ai/streamChat.ts` (~40 سطر) — pure function `streamChatResponse({ url, token, body, signal, onChunk })`.
- الهوك يستدعيها فقط ويُدير الحالة.

**`src/hooks/domain/financial/useAccountsActions.ts`** (184 → ≤180)
- خفض بسيط: نقل types/interfaces الداخلية (`ActionsParams` إن لزم) إلى `src/types/financial/accountsActions.ts` (~15 سطر) واستيرادها — يكفي لإنزالها إلى ~170 سطر.

### القيود
- لا تعديل على ملفات auth أو Supabase المحمية.
- لا migrations.
- نصوص عربية RTL، `hsl(var(--*))` فقط، `logger` بدل console.
- الاحتفاظ بحدود pages ≤200 / hooks ≤180.

### التحقق بعد التنفيذ
1. `bunx vitest run` للتأكد من عدم كسر اختبارات `SystemDiagnosticsPage.test.tsx` و`page-controls`.
2. فتح `/dashboard/diagnostics` ← تشغيل الفحص ← التأكد من:
   - "أزرار بدون معالج" → **pass**
   - "aria-label للأيقونات" → **pass**
   - "حدود حجم الملفات" → **pass**
