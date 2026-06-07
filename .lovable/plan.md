# خطة تنظيف الملفات — تحقّق جنائي صارم ومُعتمَد

## ملخص التحقق

شغّلت وكيل فحص جنائي شامل، ثم **أعدت التحقق يدوياً من كل بند عبر `rg`** على المشروع الفعلي. النتيجة: **8 من 12 اقتراحاً للوكيل كانت false positives** (ملفات بدت يتيمة لكنها مُستخدَمة فعلياً عبر مسارات نسبية أو من ملفات أعمق لم يفحصها grep السطحي).

النتيجة النهائية: **4 ملفات فقط** آمنة الحذف بثقة عالية.

## ❌ False positives من الوكيل (تم رفضها — تبقى)

| الملف/المسار | دليل الإبقاء (تم تأكيده بـ rg) |
|---|---|
| `src/components/accounts/contracts/originBadge.tsx` | مُستخدم في `AccountsContractsMobileList.tsx:9,45` و `AccountsContractsDesktopTable.tsx:9,61` |
| `src/hooks/application/dashboard/useEndUserDashboardData.ts` | مُستخدم في 7 ملفات (waqif + 6 beneficiary hooks) |
| `src/hooks/application/dashboard/useEndUserFinancials.ts` | مُستخدم في 7 ملفات |
| `src/lib/messages/index.ts` | مُستخدم في **15 ملفاً** |
| `supabase/functions/zatca-renew/` | يُستدعى من `src/lib/services/zatcaService.ts:17` |
| `scripts/install-git-hooks.sh` | مرجَّع في `CONTRIBUTING.md` (سطرين) و `audit/structure-deep-review.md` |
| `public/pwa-192x192.png` | مرجَّع في `vite.config.ts` PWA manifest (السطر 31, 135) |
| `src/utils/pdf/shared/renderers/index.ts` | barrel مُستخدم من `paymentInvoiceShared.ts:11` بمسار نسبي `../shared/renderers/index` (الوكيل بحث بـ `@/` فقط) |
| كل ملفات barrel الأخرى | لديها مستوردون فعليون (1–16 لكل barrel) |

## ✅ التنظيف المُعتمَد

### Phase 1 — HIGH Confidence (آمن 100%)

| # | الإجراء | المسار | الدليل |
|---|---|---|---|
| 1 | حذف ملف | `scripts/_archive/codemod-common-barrel.mjs` | 0 مراجع في `.github/`, `package.json`, أو أي CI |
| 2 | حذف مجلد | `scripts/_archive/` (يصبح فارغاً بعد #1) | لا محتوى آخر |
| 3 | حذف ملف | `public/placeholder.svg` | 0 مراجع في `src/`, `index.html`, `public/_headers`, `vite.config.ts` |

### Phase 2 — MED Confidence (تنظيف منخفض الأثر)

| # | الإجراء | المسار | السبب |
|---|---|---|---|
| 4 | حذف barrel | `src/types/data/index.ts` | re-export فقط لـ `./crudFactory`؛ كل المستوردين الستة يستوردون مباشرةً من `@/types/data/crudFactory`؛ barrel نفسه = 0 مستوردين |

### Phase 3 — للمراجعة فقط (لا حذف)

| # | المسار | الملاحظة |
|---|---|---|
| 5 | `supabase/functions/beneficiary-summary/` | لا `invoke()` من frontend، لكن README يذكره كـ Category A نشط. **القرار**: إبقاء وتمييز للمراجعة لاحقاً مع مالك المشروع. |

## التنفيذ

**حذف 4 عناصر فقط:**
```
scripts/_archive/codemod-common-barrel.mjs
scripts/_archive/                  (المجلد كاملاً)
public/placeholder.svg
src/types/data/index.ts
```

لا تعديل على أي ملف آخر. صفر تأثير متوقَّع على build/runtime/tests.

## التحقق بعد التنفيذ

1. `rg -n "placeholder.svg" .` → يجب أن يُرجِع 0
2. `rg -n "from ['\"]@/types/data['\"]" src/` → يجب أن يُرجِع 0
3. `rg -n "_archive|codemod-common" .` → يجب أن يُرجِع 0
4. تشغيل البناء التلقائي للتأكد من عدم وجود أخطاء TS

## خارج النطاق

- ملفات `audit/*.csv` و `audit/report.html`: مُولَّدة لكن مرجَّعة في `CONTRIBUTING.md` — قرار `.gitignore` يحتاج موافقة الفريق.
- لا تغييرات على قاعدة البيانات أو edge functions.
- لا إعادة هيكلة.
