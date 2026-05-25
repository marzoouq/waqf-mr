## توحيد إنشاء المصروف مع سند الصرف — تدفق متسلسل ذكي

### السلوك الجديد
1. الناظر/المحاسب ينقر "إضافة مصروف" → النموذج الحالي كما هو → حفظ.
2. عند نجاح الحفظ تُغلق نافذة المصروف وتُفتح فوراً نافذة سند الصرف معبّأة بـ:
   - `expense_id` (المصروف المُنشأ حديثاً)
   - `expenseAmount` (من المصروف، للتحقق + التعبئة)
   - `defaultDescription` (وصف المصروف)
3. ثلاثة أزرار في أسفل نافذة السند:
   - **إصدار لاحقاً** — يُغلق النافذة بدون إنشاء سند. المصروف يبقى محفوظاً ويمكن إنشاء سند له لاحقاً من زر "+ سند صرف" في توسعة الصف.
   - **حفظ كمسودة** — يُنشئ السند بحالة `draft`.
   - **حفظ واعتماد + PDF** — ينشئ السند ثم يستدعي `approveMut.mutateAsync(voucherId)` ثم يُولّد PDF فوراً.
4. عند **تعديل** مصروف موجود: لا تُفتح نافذة السند تلقائياً (تجنّب التكرار).
5. تدفق المحاسب يستفيد تلقائياً من نفس السلوك.

### الملفات المتأثرة
| الملف | التغيير |
|---|---|
| `src/hooks/page/admin/financial/useExpensesPage.ts` | إضافة state `postCreateVoucherFor: { id, amount, description } \| null`. بعد `createExpense.mutateAsync(...)` التقاط النتيجة وضبط الـ state. تصدير `postCreateVoucherFor` و `clearPostCreateVoucher`. |
| `src/pages/dashboard/ExpensesPage.tsx` | إضافة `<VoucherFormDialog>` على مستوى الصفحة مع `open={!!postCreateVoucherFor}`، تمرير `expenseId`/`expenseAmount`/`defaultDescription`، و `onOpenChange` يستدعي `clearPostCreateVoucher`. |
| `src/components/expenses/vouchers/VoucherFormDialog.tsx` | (أ) استدعاء `useApproveVoucher` داخل المكون. (ب) إضافة handler `submitAndApprove` يستدعي `createMut.mutateAsync` ثم `approveMut.mutateAsync(voucherId)`. (ج) `DialogFooter` يصبح ثلاثة أزرار: "إصدار لاحقاً" (ghost) + "حفظ كمسودة" + "حفظ واعتماد + PDF" (default). |

### القيود
- لا migration، لا RLS، لا edge functions، لا تعديل على نموذج المصروف، لا تغيير على جدول `disbursement_vouchers`.
- لا حقول جديدة في النموذج (لا `payment_date`، لا `defaultAmount`، لا `defaultDate`).
- استخدام `logger` بدل `console.*`، رسائل toast عربية عبر `sonner`.

### التحقق بعد التنفيذ
1. إضافة مصروف جديد → نافذة السند تفتح تلقائياً معبّأة بالمبلغ والوصف.
2. "إصدار لاحقاً" → المصروف محفوظ، لا سند مُنشأ، رسالة نجاح للمصروف فقط.
3. ملء بيانات المستلم + "حفظ واعتماد + PDF" → سند بحالة `approved` + تنزيل PDF + تحديث القوائم.
4. تعديل مصروف موجود → نافذة السند لا تفتح تلقائياً.
5. توسعة صف مصروف بدون سند → زر "+ سند صرف" يعمل كما السابق.
6. تشغيل `bunx vitest run` للتأكد من عدم كسر اختبارات قائمة.
