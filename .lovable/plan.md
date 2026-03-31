

# تدقيق معماري شامل — تقرير القراءة فقط

## الحالة العامة

البنية المعمارية **جيدة بشكل ملحوظ** مقارنة بالتدقيق السابق. تم تنفيذ معظم التوصيات السابقة بنجاح:
- ✅ توحيد `useAuth` — لا يوجد أي استيراد من `@/contexts/AuthContext` (باستثناء `AuthContext.tsx` نفسه)
- ✅ نقل `themeDefinitions` و `themeColor.utils` إلى `src/lib/theme/`
- ✅ نقل `notificationTones` إلى `src/constants/`
- ✅ إضافة callback pattern في `useCrudFactory`
- ✅ تقسيم `LoginForm` (213 سطر) و `useWebAuthn` (227 سطر) — أصبحا تحت الحد

---

## المشاكل المتبقية — مرتبة حسب الأولوية

### 1. [حرج] ملفات re-export مهملة يمكن حذفها

الملفات التالية أصبحت **بدون أي مستهلك** — كل الاستيرادات تذهب مباشرة للمسار الجديد:

| ملف مهمل | المسار الجديد | مستهلكون متبقون |
|---|---|---|
| `src/components/themeDefinitions.ts` | `src/lib/theme/themeDefinitions.ts` | **0** |
| `src/components/themeColor.utils.ts` | `src/lib/theme/themeColor.utils.ts` | **0** |
| `src/hooks/data/notificationTones.ts` | `src/constants/notificationTones.ts` | **0** |
| `src/components/ui/use-toast.ts` | `src/hooks/ui/use-toast.ts` | **0** (فقط AuthContext يستورد من hooks/ui مباشرة) |

**التوصية**: حذف هذه الملفات الأربعة — هي dead code الآن.

### 2. [مهم] toast ما زال مقترنًا مباشرة في 15 ملف data hook

رغم إضافة `CrudNotifications` callback في `useCrudFactory`، فإن **15 ملفًا** في `src/hooks/data/` ما زالت تستورد `toast` من `sonner` مباشرة:

- `useSupportTickets.ts` (263 سطر)
- `useAdvanceRequests.ts` (298 سطر)
- `usePropertyUnits.ts`
- `useBylaws.ts`
- `useUnits.ts`
- `useExpenses.ts`
- `useIncome.ts`
- `useInvoices.ts`
- `usePaymentInvoices.ts`
- `useAnnualReport.ts`
- `useTenantPayments.ts`
- `useRealtimeAlerts.ts`
- `useNotificationPreferences.ts`
- `useCrudFactory.ts` (default fallback — مقبول)

الملفات التي تستخدم `createCrudFactory` (مثل `useUnits`, `useBylaws`, `useInvoices`) تستورد toast **بالإضافة** إلى ما يوفره الـ factory — أي أنها تستخدمه في mutations خارج الـ factory. هذا يعني أن الـ callback pattern لم يُعمَّم بعد على الـ mutations اليدوية.

**التوصية**: في الملفات التي تبني mutations يدويًا (خارج `createCrudFactory`)، استبدال `toast` المباشر بـ callback parameter أو على الأقل تمريره من الـ page hook.

### 3. [مهم] ملفان يقتربان من حد 300 سطر

| ملف | الأسطر | ملاحظة |
|---|---|---|
| `useAdvanceRequests.ts` | 298 | يحتوي CRUD كامل + منطق ترحيل سالب + إشعارات — يمكن استخراج منطق الترحيل |
| `AdminDashboard.tsx` | 282 | مقبول لكن يحتوي JSX كثيف — يمكن استخراج بعض الأقسام كمكونات فرعية |
| `useSupportTickets.ts` | 263 | يحتوي 6 hooks + تعريف types + دالة export — يمكن فصل الـ types |

**التوصية**: `useAdvanceRequests.ts` هو الأقرب للحد — استخراج منطق الترحيل السالب إلى ملف مستقل.

### 4. [متوسط] اختبار `findAccountByFY.test.ts` في مكان غير مناسب

الاختبار موجود في `src/hooks/financial/findAccountByFY.test.ts` بينما الدالة نفسها في `src/utils/findAccountByFY.ts`. كما أن `useAccountsPage.ts` يعيد تصدير `findAccountByFY` "للتوافق مع الاختبارات" — وهو نمط هش.

**التوصية**: نقل الاختبار إلى `src/utils/findAccountByFY.test.ts` وإزالة إعادة التصدير من `useAccountsPage.ts`.

### 5. [متوسط] نظام toast مزدوج

يوجد نظامان للـ toast:
- `sonner` — المستخدم في **كل** الكود تقريبًا (46+ ملف)
- `src/hooks/ui/use-toast.ts` — نظام toast مخصص (185 سطر) يستخدمه فقط `AuthContext.tsx` (لـ `clearToasts`)

**التوصية**: التحقق إذا كان `clearToasts` يمكن استبداله بـ `toast.dismiss()` من sonner. إذا نعم، يمكن حذف `use-toast.ts` بالكامل (185 سطر dead code).

### 6. [اختياري] حدود `lib/` vs `utils/` ما زالت غير واضحة تمامًا

- `src/lib/` يحتوي: logger, queryClient, performance, theme, lazyWithRetry, componentPrefetch
- `src/utils/` يحتوي: format, csv, xlsx, pdf/, diagnostics/, maskData, safeNumber, notifications, contractAllocation, chartHelpers, dashboardComputations

هذا التقسيم **معقول** لكن غير موثق. `dashboardComputations.ts` و `chartHelpers.ts` يمكن اعتبارها أقرب لـ `lib/`.

**التوصية**: إضافة تعليق في كل مجلد (أو README صغير) يوضح القاعدة. ليس بأولوية عالية.

### 7. [اختياري] بعض ملفات الاختبار colocated وبعضها في `src/test/`

- اختبارات معظم الـ hooks و components موجودة بجانب ملفاتها (colocated) ✅
- لا يوجد `src/test/` كمجلد مركزي — هذا نمط جيد ومتسق

لا توجد مشكلة فعلية هنا.

---

## ملخص الخطوات المقترحة

| # | الأولوية | الخطوة | الجهد |
|---|---|---|---|
| 1 | حرج | حذف 4 ملفات re-export مهملة (لا مستهلكين) | صغير |
| 2 | مهم | تعميم toast callback على data hooks اليدوية (أو على الأقل الأكثر استخدامًا) | متوسط |
| 3 | مهم | تقسيم `useAdvanceRequests.ts` — استخراج منطق الترحيل السالب | صغير |
| 4 | متوسط | نقل `findAccountByFY.test.ts` وإزالة re-export الهش | صغير |
| 5 | متوسط | تقييم حذف نظام toast المخصص (`use-toast.ts`) لصالح sonner فقط | صغير-متوسط |
| 6 | اختياري | توثيق قاعدة `lib/` vs `utils/` | صغير |

