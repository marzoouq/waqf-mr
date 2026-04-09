

# تقرير تدقيق البنية المعمارية الشامل

## التقييم العام: 4.5 / 5

بنية ممتازة. **صفر انتهاكات طبقية**: لا استيرادات Supabase في المكونات، لا استيرادات عكسية (hooks→components أو utils→hooks)، صفر `console.*` في الإنتاج، صفر `: any` في الإنتاج، صفر ألوان ثابتة.

---

## نقاط القوة

| المعيار | النتيجة |
|---------|---------|
| فصل الطبقات (data / ui / page) | مثالي — صفر انتهاكات |
| عزل Supabase عن المكونات | صفر استيرادات مباشرة |
| استيرادات دائرية | صفر |
| `console.*` في الإنتاج | صفر |
| `: any` في الإنتاج | صفر |
| ألوان ثابتة (Tailwind) | صفر |
| Edge Functions منظمة | 16 وظيفة + `_shared` مشترك |
| Lazy loading | كامل لكل الصفحات |
| Barrel files | موجودة في أغلب المجلدات |

---

## التوصيات بالترتيب

### الأولوية العالية (3 نقاط)

**1. توحيد `SortDir` — 3 تعريفات مكررة**

| الموقع | ملاحظة |
|--------|--------|
| `src/types/sorting.ts` | المصدر الصحيح |
| `src/hooks/ui/useTableSort.ts` | تكرار — يجب استيراده من `@/types/sorting` |
| `src/hooks/page/admin/financial/usePaymentInvoicesTab.ts` | تكرار — يجب استيراده من `@/types/sorting` |

الإجراء: حذف التعريفين المكررين واستبدالهما باستيراد من `@/types/sorting`.

**2. تمييز `FilterStatus` — اسمان متطابقان لقيم مختلفة**

- `useCollectionData.ts`: `'all' | 'overdue' | 'partial' | 'complete'`
- `usePaymentInvoicesTab.ts`: `'all' | 'pending' | 'paid' | 'overdue' | 'partially_paid'`

الإجراء: إعادة تسمية إلى `CollectionFilterStatus` و `InvoiceFilterStatus` لمنع الالتباس. يمكن نقلهما إلى `@/types/filters.ts` مستقبلاً.

**3. توحيد `SortField` في `ExpensesDesktopTable`**

المكوّن يعرّف `type SortField` محلياً بنفس قيم الهوك `useExpensesPage`. يجب استيراده من الهوك بدلاً من التكرار.

ملاحظة: `SortField` في `useIncomePage` و `usePaymentInvoicesTab` (`SortKey`) لها قيم مختلفة — هذا مبرر ولا يحتاج توحيد.

### الأولوية المتوسطة (2 نقطة)

**4. إضافة barrel files مفقودة — 3 مجلدات**

| المجلد | ملاحظة |
|--------|--------|
| `src/hooks/data/financial/` | كل مجلدات `hooks/data/*` الأخرى لديها `index.ts` |
| `src/components/landing/` | لاتساق نمط الاستيراد |
| `src/components/my-share/` | لاتساق نمط الاستيراد |

(`src/components/ui/` مستثنى — shadcn لا يستخدم barrel).

**5. مراقبة الملفات الكبيرة (لا إجراء فوري)**

| الملف | الأسطر | ملاحظة |
|-------|--------|--------|
| `comprehensiveBeneficiary.ts` | 281 | PDF report — منطقي كملف واحد |
| `reports.ts` (PDF) | 249 | مقبول |
| `AuthContext.tsx` | 238 | محمي — لا تعديل |
| `AuditLogPage.tsx` | 206 | قريب من الحد |
| `ReportsPage.tsx` | 200 | قريب من الحد |

هذه لا تتجاوز حد الـ 250 سطر (ما عدا PDF utilities وهي مبررة). تستحق المراقبة فقط.

### اختياري (1 نقطة)

**6. توسيع `src/types/sorting.ts`**

الملف يحتوي حالياً على سطر واحد فقط (`SortDir`). يمكن إضافة `SortConfig<T>` كنوع generic ليُستخدم مع `useTableSort`.

---

## ملخص خطة التنفيذ

| # | الإجراء | الملفات المتأثرة |
|---|---------|-----------------|
| 1 | توحيد `SortDir` — حذف التكرارات | 3 |
| 2 | تمييز `FilterStatus` بأسماء فريدة | 2 |
| 3 | استيراد `SortField` في `ExpensesDesktopTable` من الهوك | 1 |
| 4 | إضافة barrel files مفقودة | 3 ملفات جديدة |
| **المجموع** | | **9 ملفات** |

## التفاصيل التقنية

- الخطوات 1–3: تعديلات استيراد فقط — صفر تغيير في المنطق
- الخطوة 4: ملفات `index.ts` جديدة تعيد تصدير المكونات/الهوكات الموجودة
- التحقق: `npx tsc --noEmit` بعد التنفيذ

