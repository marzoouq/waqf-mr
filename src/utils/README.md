# src/utils/

دوال مساعدة نقية (pure helper functions) لا تحتفظ بحالة.

## القاعدة
ضع هنا **دوال نقية** قابلة للاختبار بسهولة:
- تنسيق البيانات (format, maskData, safeNumber)
- تحويل الملفات (csv, xlsx)
- حسابات مالية (dashboardComputations, contractAllocation, distributionCalcPure)
- توليد PDF (pdf/) — **تُرجع Blob/نتيجة فقط، بدون رفع أو إشعارات**
- تشخيصات (diagnostics/) — تستخدم `lib/services/diagnosticsService.ts` للاستعلامات

## الفرق عن `src/lib/`

| الخاصية | `utils/` | `lib/` |
|---------|----------|--------|
| **النوع** | دوال نقية (pure functions) | بنية تحتية ذات حالة |
| **الحالة** | بدون حالة (stateless) | قد تحتفظ بحالة (stateful) |
| **الآثار الجانبية** | ممنوعة | مسموحة (Supabase, Auth, Storage) |
| **الاختبار** | سهل — مدخلات ومخرجات | يحتاج mocks للخدمات الخارجية |
| **أمثلة** | `format()`, `calculateDistributions()` | `logger`, `queryClient`, `supabase client` |

## ممنوعات في هذا المجلد

- ❌ استيراد `toast` من `sonner`
- ❌ استيراد `supabase` مباشرة — استخدم `lib/services/` للاستعلامات
- ❌ تعديل قاعدة البيانات أو رفع ملفات — هذه مسؤولية `lib/services/`
- ❌ `import.meta` مع آثار جانبية (initialization)
- ❌ singletons أو module-level state يتغيّر

### مثال: إرجاع نتيجة بدلاً من toast

```ts
// ❌ خطأ — utils/ تستدعي toast
import { toast } from 'sonner';
export function generateReport(data: Row[]) {
  if (!data.length) {
    toast.error('لا توجد بيانات');
    return null;
  }
  return buildPdf(data);
}

// ✅ صحيح — utils/ تُرجع نتيجة، الطبقة المستدعية تُشعر
export type ReportResult =
  | { ok: true; blob: Blob }
  | { ok: false; reason: 'empty' | 'invalid' };

export function generateReport(data: Row[]): ReportResult {
  if (!data.length) return { ok: false, reason: 'empty' };
  return { ok: true, blob: buildPdf(data) };
}

// في hooks/page/ — هنا يحدث الإشعار
const result = generateReport(rows);
if (!result.ok) notify.error('لا توجد بيانات');
```

## Barrel exports (`index.ts`)

أنشئ `index.ts` لمجلد فرعي عندما:
- يحتوي **3 ملفات أو أكثر** مرتبطة وظيفياً
- يُستهلك من **3 مواقع مختلفة أو أكثر** خارج المجلد
- المسارات الطويلة تتكرر (`utils/auth/permissions/canModifyFiscalYear`)

نماذج معتمدة:
- `utils/auth/index.ts` — يصدّر `canModifyFiscalYear`, `filterLinksBySectionVisibility`, `RouteLink`
- `utils/export/index.ts` — يصدّر helpers تصدير CSV/XLSX

تجنّب barrel لمجلد فيه ملف واحد أو ملفان — يضيف indirection بلا فائدة.
