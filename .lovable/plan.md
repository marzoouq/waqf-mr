

# تقرير مراجعة معمارية شامل (1019 ملف TypeScript)

## ملخص تنفيذي
المشروع في حالة معمارية **ممتازة**. الفصل بين الطبقات محترم بصرامة، ولا توجد مكونات تستدعي `supabase` مباشرة (0/410)، ولا استخدام لـ `console.*` خارج `logger.ts` و ملفات الاختبار، ولا ألوان hex ثابتة في المكونات. هذه نتيجة استثنائية.
الملاحظات أدناه **تحسينات صقل** وليست ديوناً تقنية حرجة.

---

## النتائج التفصيلية

### ✅ نقاط القوة المؤكدة
| الفحص | النتيجة |
|---|---|
| مكونات تستورد `supabase/client` مباشرة | **0 / 410** |
| مكونات تستورد `sonner` toast مباشرة | 0 |
| استخدامات `console.*` خارج logger | 0 (فقط داخل `logger.ts` نفسه) |
| ألوان hex ثابتة في `components/` و `pages/` | 0 |
| `hooks/` تستورد من `pages/` أو `components/` | 1 فقط (مبررة جزئياً) |
| `hooks/data/` تعتمد على `hooks/page/` | 0 (الاتجاه صحيح) |
| تعليقات TODO/FIXME/HACK | 3 فقط |
| Edge Functions | 16 وظيفة منظمة + `_shared` |

### 🟡 مشاكل واضحة يجب معالجتها

**1. انتهاك طبقات حقيقي واحد** (`utils → hooks`)
```
src/utils/financial/multiYearHelpers.ts:5
  import type { YearSummaryEntry } from '@/hooks/data/financial/useMultiYearSummary';
```
`utils/` يجب ألا يعرف بوجود `hooks/`. النوع يجب أن ينتقل إلى `src/types/financial/`.

**2. ثوابت غير-UI داخل `components/`**
```
src/components/notifications/notificationConstants.ts
```
يُستخدم من `hooks/page/beneficiary/notifications/useNotificationsPage.ts` — هذا يجبر طبقة hooks على الاستيراد من components. الجزء النصي (`NOTIFICATION_CATEGORIES`) يجب أن يكون في `src/lib/notifications/` (حيث يوجد بالفعل `beneficiaryNotificationVisibility.ts`)، بينما `typeConfig` (يحوي أيقونات Lucide) يبقى في components.

**3. ملفات اختبار ناقصة على كود حرج**
- `src/lib/realtime/bfcacheSafeChannel.ts` — مهم لاستقرار الاتصال
- `src/utils/diagnostics/checks/zatca.ts` — 177 سطر، لا اختبار
- `src/utils/pdf/invoices/paymentInvoiceProfessional.ts` — 180 سطر، لا اختبار
- `src/lib/notifications/beneficiaryNotificationVisibility.ts` — جديد، حساس، بدون اختبار

**4. تسرب أنواع من hooks (97 export type/interface)**
معظمها مقبول، لكن أنواع البيانات الأساسية (`YearSummaryEntry`, `AccessLogEntry`, `AnnualReportItem`, `ContractForPdf`) يجب أن تنتقل إلى `src/types/<domain>/` لمنع التسرب وتسهيل إعادة الاستخدام.

### 🟢 ملاحظات تنظيمية (اختيارية)

**5. كثافة `hooks/page/admin/financial/` (20 ملف في مجلد واحد)**
يمكن تقسيمه إلى مجلدات فرعية أنظف:
```
hooks/page/admin/financial/
  ├── invoices/      (useInvoicesPage, useCreateInvoiceForm, useInvoiceFormState, …)
  ├── accounts/      (useAccountsPage, useDistributionCalculation, useCarryforwardData)
  ├── income/        (useIncomePage, useCollectionData)
  └── expenses/      (useExpensesPage, useFiscalYearManagement)
```

**6. `lib/services/` — فلسفة مختلطة**
ملفات مثل `notificationService.ts` و `zatcaService.ts` يجب أن تُدمج داخل مجلداتها المتخصصة:
- `notificationService.ts` → `lib/notifications/notificationService.ts`
- `zatcaService.ts` → اختياري: `lib/zatca/`
- النواة (`dataFetcher`, `accessLogService`, `securityService`) تبقى في `lib/services/`.

**7. `src/utils/README.md` تحتوي مثال خاطئ**
السطر 35 يحوي `import { toast } from 'sonner'` كمثال لـ "ما لا يجب فعله". بسبب تعليقات Markdown المضمَّنة، يلتقطه فحص grep كاحتياطي. الحل: تغليفه في كتلة كود محايدة أو نقله لمستند منفصل.

---

## خطة عمل مرتبة (الأكثر أهمية أولاً)

### P0 — حرج (يجب إصلاحه)
1. **نقل `YearSummaryEntry`** من `hooks/data/financial/useMultiYearSummary.ts` إلى `src/types/financial/multiYear.ts`، وتحديث الاستيرادات في الملفين (`useMultiYearSummary.ts` + `multiYearHelpers.ts`).

### P1 — مهم (تحسين بنيوي)
2. **تقسيم `notificationConstants.ts`**:
   - نقل `NOTIFICATION_CATEGORIES` (نص فقط) → `src/lib/notifications/notificationCategories.ts`
   - إبقاء `typeConfig` (يحوي أيقونات JSX) في `components/notifications/`
   - تحديث الاستيراد في `useNotificationsPage.ts`

3. **إضافة اختبارات للملفات الحرجة الأربعة**:
   - `bfcacheSafeChannel.test.ts` (lifecycle, mock supabase channel)
   - `checks/zatca.test.ts` (سيناريوهات الشهادة المنتهية / غير المُهيأة)
   - `paymentInvoiceProfessional.test.ts` (snapshot للحسابات الرئيسية)
   - `beneficiaryNotificationVisibility.test.ts` (مصفوفة الحالات: 4 تركيبات إعدادات × 3 أنواع إشعارات)

### P2 — تحسين (تنظيم)
4. **استخراج أنواع البيانات الأساسية من hooks/data إلى types/**: ركّز على الأكثر استهلاكاً عبر القاعدة (`AccessLogEntry`, `ContractForPdf`, `BeneficiaryDashboardData`, `AnnualReportItem`).

5. **إعادة هيكلة `hooks/page/admin/financial/` إلى 4 مجلدات فرعية** (invoices/accounts/income/expenses) مع تحديث الاستيرادات.

6. **توحيد `lib/services/` حسب الدومين**: نقل `notificationService.ts` إلى `lib/notifications/`، وتحديث `lib/services/index.ts`.

### P3 — صقل (اختياري)
7. **تنظيف `src/utils/README.md`** — تغليف أمثلة "الممنوع" بحيث لا يلتقطها فحص grep لانتهاكات الطبقات.

8. **مراجعة الـ 6 صفحات بدون page hooks** للتأكد من بقائها بسيطة فعلاً (`UserManagementPage` آمنة، تستخدم `useUserManagement` من `hooks/auth/` بمبرر موثَّق).

9. **توثيق نمط `*ContextValue.ts` المنفصل** (المستخدم في `ContractsContextValue.ts`) كقاعدة في `core-modularization-standard-v7` — لتفعيل Fast Refresh.

---

## التقدير الزمني
- **P0**: ~10 دقائق (نقل نوع واحد)
- **P1**: ~45 دقيقة (تقسيم + 4 ملفات اختبار)
- **P2**: ~30 دقيقة
- **P3**: ~15 دقيقة

**الإجمالي:** ~100 دقيقة لتحسين كامل، أو ~10 دقائق فقط للنقطة P0 الحرجة وحدها.

## التوصية
ابدأ بـ **P0 + P1** فقط. النقاط P2/P3 مفيدة لكن المشروع يعمل بصحة معمارية ممتازة الآن، ولا داعي لإعادة تنظيم واسعة. هل تريد المتابعة بـ P0+P1، أو P0 فقط؟

