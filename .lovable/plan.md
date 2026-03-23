

# تقرير الفحص الشامل — مارس 2026

---

## 1. فحص الهندسة المعمارية (Architecture Audit)

### ✅ نقاط القوة

| البند | التقييم |
|-------|---------|
| **Lazy Loading** | جميع الصفحات (~50) تستخدم `lazyWithRetry` مع retry تلقائي |
| **فصل الاهتمامات** | hooks منفصلة عن المكونات، contexts مستقلة، utils مصنّفة |
| **CRUD Factory** | `useCrudFactory` يوحّد عمليات CRUD لـ 15+ جدول — ممتاز |
| **Financial Computation** | طبقة ثلاثية نظيفة: `useRawFinancialData` → `useComputedFinancials` → `useFinancialSummary` |
| **QueryClient** | تكوين مركزي مع error handling وretry ذكي (لا يعيد 4xx) |
| **Error Boundaries** | متعددة الطبقات (App → Router → Components) |
| **PWA** | `SwUpdateBanner` + `PwaUpdateNotifier` + `DeferredRender` للأداء |
| **Security** | `SecurityGuard` + `ProtectedRoute` + `useIdleTimeout` + access logging |
| **Testing** | ~80 ملف اختبار (hooks, pages, components, utils, integration) |

### ⚠️ ملاحظات تحتاج مراجعة

**1. حجم بعض الملفات**
- `PropertyUnitsDialog.tsx` — ملف ضخم (700+ سطر). يجمع عرض الجوال وسطح المكتب ومنطق الحوار في مكون واحد.
- `PropertiesPage.tsx` و `PropertiesViewPage.tsx` — يحتويان منطق حساب مالي مكرر.
- **التوصية:** استخراج منطق الحساب المالي لكل عقار إلى hook مشترك `usePropertyFinancials`.

**2. تكرار منطق الحساب بين صفحتي العقارات**
- صفحة الناظر (`PropertiesPage`) وصفحة المستفيد (`PropertiesViewPage`) تحسبان الدخل/المصروفات/الصافي بمنطق مشابه جداً. تم إصلاح تناقضات سابقة لكن المنطق لا يزال مكرراً.
- **التوصية:** إنشاء `usePropertyFinancials(propertyId, contracts, income, expenses)` يُستخدم في الصفحتين.

**3. PDF — نظامان متوازيان**
- `utils/pdf/` يحتوي 15+ ملف لتوليد PDF بـ jsPDF (إحداثيات يدوية).
- تم إضافة `html2canvas` للمعاينة → PDF في الفواتير.
- **التوصية:** توحيد تدريجي — الملفات الحالية تبقى للتصدير الجماعي، والمعاينة تستخدم html2canvas.

---

## 2. فحص قاعدة البيانات (Database Audit)

### ✅ الهيكل العام

| البند | التقييم |
|-------|---------|
| **عدد الجداول** | 25+ جدول + 2 عرض آمن (views) |
| **RLS** | 37/37 جدول مغطى بسياسات |
| **Foreign Keys** | موجودة على الجداول الأساسية |
| **Audit Logging** | 10 جداول أساسية مع triggers |
| **Fiscal Year Protection** | `is_fiscal_year_accessible()` RESTRICTIVE على 10 جداول |
| **Locked Year Triggers** | 5 جداول محمية من التعديل بعد الإقفال |
| **Safe Views** | `beneficiaries_safe` + `contracts_safe` مع PII masking |

### ⚠️ ملاحظات

**1. جدولان متوازيان للفواتير**
- `invoices` (فواتير عامة — مشتريات/مصروفات)
- `payment_invoices` (فواتير الدفعات — إيجارات)
- `invoice_items` و `invoice_chain` تدعم كلاهما عبر `source_table`
- **الحالة:** تصميم مقصود — كل نوع له دورة حياة مختلفة. لا حاجة للدمج.

**2. `tenant_payments` — جدول تتبع الدفعات**
- بعد إلغاء الدفع اليدوي، أصبح يُحدّث حصرياً عبر RPC `pay_invoice_and_record_collection`.
- **الحالة:** ✅ سليم — المسار الوحيد للتحديث هو عبر الفواتير.

**3. لا يوجد جداول غير مستخدمة**
- جميع الجداول مرتبطة بوظائف فعلية في التطبيق.

---

## 3. فحص الأمان (Security Summary)

| البند | الحالة |
|-------|--------|
| Edge Functions Auth (`getUser()`) | ✅ 8/8 |
| Rate Limiting | ✅ على جميع الوظائف الحساسة |
| Anon Role Hardening (`REVOKE ALL`) | ✅ مع Event Trigger تلقائي |
| PII Encryption (Vault) | ✅ |
| `user_roles` RLS | ✅ تم إصلاحها (authenticated فقط) |
| ZATCA Certificates | ✅ admin only |
| Message Immutability | ✅ content + sender_id محميان |
| Idle Timeout | ✅ |
| Access Logging | ✅ immutable |

---

## 4. تغطية الاختبارات

### الحالة الحالية

```text
الطبقة              | ملفات الاختبار | التغطية
─────────────────────┼───────────────┼────────
Hooks               | 30+ .test.ts  | عالية
Pages               | 20+ .test.tsx | متوسطة
Components          | 10+ .test.tsx | متوسطة
Utils               | 15+ .test.ts  | عالية
Integration (src/test)| 14 ملف      | شاملة
Edge Functions      | عبر edgeFunctionAuth.test | أساسية
```

### فجوات في التغطية

| الملف/المكون | نوع الاختبار المطلوب |
|-------------|---------------------|
| `PropertyUnitsDialog.tsx` | لا يوجد اختبار — مكون معقد |
| `InvoicePreviewDialog.tsx` | لا يوجد اختبار — تدفق PDF الجديد |
| `ContractFormDialog.tsx` | لا يوجد اختبار |
| `CloseYearChecklist.tsx` | لا يوجد اختبار — منطق حرج |
| `DistributeDialog.tsx` | لا يوجد اختبار — عملية مالية |
| Edge Functions (فردية) | اختبارات `curl` للوظائف الفردية |

---

## 5. ملخص التوصيات

| # | التوصية | الأولوية | الجهد |
|---|---------|----------|-------|
| 1 | استخراج `usePropertyFinancials` hook مشترك | متوسطة | نصف يوم |
| 2 | تفكيك `PropertyUnitsDialog` إلى مكونات فرعية | منخفضة | نصف يوم |
| 3 | إضافة اختبارات لـ `CloseYearChecklist` و `DistributeDialog` | متوسطة | ساعتان |
| 4 | إضافة اختبار لتدفق PDF الجديد (`html2canvas`) | منخفضة | ساعة |
| 5 | توثيق قواعد العمل المالية (rent_amount سنوي دائماً) | منخفضة | ساعة |

---

## الخلاصة

```text
╔══════════════════════════════════════════════════╗
║  التقييم العام: ✅ ممتاز                         ║
╠══════════════════════════════════════════════════╣
║  الهندسة المعمارية: نظيفة ومنظمة                ║
║  فصل الاهتمامات: ممتاز (hooks/utils/contexts)   ║
║  قاعدة البيانات: 37/37 RLS + Audit + Encryption ║
║  الأمان: لا مشاكل حرجة                          ║
║  الاختبارات: تغطية جيدة مع فجوات محددة           ║
║  مشاكل حرجة: 0                                   ║
║  تحسينات هيكلية: 5 (جميعها منخفضة-متوسطة)       ║
╚══════════════════════════════════════════════════╝
```

