

# خطة إصلاح المشاكل المعمارية المتبقية — الجولة 3

## التحقق من الادعاءات

| # | الادعاء | النتيجة |
|---|---------|---------|
| 1 | كود `Test explosion` في ErrorBoundary | ✅ **مؤكد** — سطر 30 |
| 2 | `useAccountsPage` في طبقة خاطئة | ✅ **مؤكد** — في `hooks/financial/` بدلاً من `hooks/page/admin/financial/` |
| 3 | `ZatcaCertificateSafe` يجب نقله لـ `types/` | ❌ **مرفوض** — الـ interface لا يُستورد من أي ملف خارجي، مستخدم فقط داخل hook نفسه. نقله لا يضيف قيمة |
| 4 | ثوابت الدعم في hook | ❌ **مرفوض** — الثوابت موجودة فعلاً في `src/components/support/supportConstants.ts` وليس في hook. 6 ملفات تستوردها بشكل صحيح |

---

## الخطوات المطلوبة فعلاً (2 فقط)

### الخطوة 1: إزالة شرط `Test explosion` من ErrorBoundary 🟠

إزالة السطر 29-30 من `src/components/common/ErrorBoundary.tsx`:
```typescript
// تجاهل أخطاء اختبارات الوحدة في الإنتاج
if (error.message === 'Test explosion') return;
```

إذا كانت هناك اختبارات تعتمد على هذا السلوك، يُضاف `vi.spyOn` في ملف الاختبار بدلاً من تلويث كود الإنتاج.

**ملفات**: 1 تعديل

---

### الخطوة 2: نقل `useAccountsPage` للطبقة الصحيحة 🟡

نقل الملفين:
- `src/hooks/financial/useAccountsPage.ts` → `src/hooks/page/admin/financial/useAccountsPage.ts`
- `src/hooks/financial/useAccountsPage.test.ts` → `src/hooks/page/admin/financial/useAccountsPage.test.ts`

تحديث الاستيرادات في:
- `src/pages/dashboard/AccountsPage.tsx` (سطر 8)
- `src/pages/dashboard/AccountsPage.test.tsx` (سطر 16 — vi.mock path)
- `src/hooks/page/admin/financial/index.ts` — إضافة التصدير

**ملفات**: 2 نقل + 3 تعديل مسار

---

## ملخص

| الخطوة | الملفات | الأولوية |
|--------|---------|---------|
| إزالة `Test explosion` | 1 | 🟠 |
| نقل `useAccountsPage` | 5 | 🟡 |
| **المجموع** | **6** | — |

صفر تغيير في السلوك الخارجي.

