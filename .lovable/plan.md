

# خطة إكمال الاختبار الشامل وفحص الأداء — المنهج الجنائي الكامل

---

## الحالة الحالية (مؤكدة)

| المهمة | الحالة | التفاصيل |
|--------|--------|----------|
| إصلاح الاختبارات - الجولة 1 (14 ملف) | ✅ تم | pages + hooks أساسية |
| إصلاح الاختبارات - الجولة 2 (13 ملف) | ✅ تم | accounts/ + pdf/ + contexts |
| إصلاح الاختبارات - الجولة 3 (9 ملف) | ✅ تم | صفحات dashboard + beneficiary |
| إصلاح الاختبارات المتبقية (~33 ملف) | ❌ متبقي | صفحات لم تُفحص بعد |
| إنشاء اختبارات Edge Functions | ❌ متبقي | 12 وظيفة بدون اختبارات |
| قياس الأداء | ❌ متبقي | يتطلب تسجيل دخول |

---

## المرحلة 1: تشغيل vitest run وتصنيف الفشل

تشغيل الاختبارات الكاملة وتصنيف كل فشل إلى:
- **Label drift**: تسمية عربية تغيرت
- **Mock mismatch**: hook أو بنية بيانات تغيرت
- **Missing provider**: MemoryRouter أو QueryClient ناقص
- **Responsive duplicate**: jsdom يعرض mobile + desktop معاً

---

## المرحلة 2: إصلاح الاختبارات الفاشلة المتبقية

### صفحات المستفيد (8 ملفات)
| الملف | المشكلة المتوقعة |
|-------|-----------------|
| `DisclosurePage.test.tsx` | label drift في البطاقات المالية |
| `AccountsViewPage.test.tsx` | responsive duplicates في الملخص |
| `CarryforwardHistoryPage.test.tsx` | بنية الجدول تغيرت |
| `PropertiesViewPage.test.tsx` | بطاقات المؤشرات المالية |
| `BylawsViewPage.test.tsx` | mock `useBylaws` vs `useBylawsList` |
| `BeneficiaryMessagesPage.test.tsx` | بنية المحادثات |
| `BeneficiarySettingsPage.test.tsx` | mock الإعدادات |
| `NotificationsPage.test.tsx` | بنية filteredData |

### صفحات لوحة التحكم (10 ملفات)
| الملف | المشكلة المتوقعة |
|-------|-----------------|
| `InvoicesPage.test.tsx` | أعمدة الجدول والأزرار |
| `ContractsPage.test.tsx` | responsive duplicates |
| `BylawsPage.test.tsx` | mock `useBylawsList` مقابل `useBylaws` المستخدم |
| `SettingsPage.test.tsx` | عدد التبويبات |
| `UserManagementPage.test.tsx` | بنية استجابة المستخدمين |
| `ZatcaManagementPage.test.tsx` | dynamic import + thenable chain |
| `ExpensesPage.test.tsx` | missing MemoryRouter provider |
| `IncomePage.test.tsx` | missing MemoryRouter provider |
| `BeneficiariesPage.test.tsx` | responsive duplicates في النسب |
| `AuditLogPage.test.tsx` | label drift في البادجات |

### اختبارات أخرى (5 ملفات)
| الملف | المشكلة المتوقعة |
|-------|-----------------|
| `MessagesPage.test.tsx` | بنية المحادثات |
| `SupportDashboardPage.test.tsx` | تحقق أساسي فقط |
| `SupportPage.test.tsx` | حالة فارغة |
| `InstallApp.test.tsx` | تحقق render |
| `PublicPages.test.tsx` | تحقق render |

**المنهجية لكل ملف:**
1. قراءة الملف المصدر (الصفحة) لمعرفة التسميات والبنية الحالية
2. مقارنة مع التوقعات في الاختبار
3. إصلاح: labels، providers، mocks، responsive duplicates
4. تشغيل vitest على الملف المحدد للتحقق

---

## المرحلة 3: إنشاء اختبارات Edge Functions

### الملف: `supabase/functions/lookup-national-id/index.test.ts`
اختبارات ضد الوظيفة المنشورة فعلياً:

1. **رفض طلب GET** → يتوقع 405 أو 500
2. **رفض طلب بدون body** → يتوقع 400/500
3. **رقم هوية أقل من 10 أرقام** → يتوقع 400
4. **رقم هوية صالح شكلياً لكن غير مسجل** → يتوقع 200 مع `found: true` (anti-enumeration)
5. **Rate limiting** → إرسال 6+ طلبات → يتوقع 429

### الملف: `supabase/functions/guard-signup/index.test.ts`
التحقق من وجود الاختبار وتشغيله.

### تشغيل عبر أداة `test_edge_functions`

---

## المرحلة 4: قياس الأداء

تشغيل `browser--performance_profile` على صفحة المستفيد (يتطلب تسجيل دخول في Preview):

**المقاييس المطلوبة:**
- JS Heap Size
- DOM Nodes count
- Layout/Recalc counts
- Long Tasks (>50ms)
- Script duration

**التحليل:**
- مقارنة DOM complexity مع المتوقع
- فحص long tasks وربطها بمكونات محددة
- التحقق من حجم الحزم الفعلي

---

## المرحلة 5: التحقق النهائي والتقرير

1. تشغيل `vitest run` النهائي — هدف: 0 فشل
2. التحقق من نسبة التغطية مقابل 60%
3. تجميع تقرير شامل بالنتائج

---

## ترتيب التنفيذ

```text
1. تشغيل vitest run → تصنيف الفشل الدقيق
2. إصلاح صفحات المستفيد (8 ملفات)
3. إصلاح صفحات لوحة التحكم (10 ملفات)
4. إصلاح الاختبارات الأخرى (5 ملفات)
5. تشغيل vitest run → التحقق من 0 فشل
6. إنشاء اختبار lookup-national-id
7. تشغيل اختبارات edge functions
8. قياس الأداء بالمتصفح
9. تقرير نهائي شامل
```

---

## التفاصيل التقنية

**أنماط الإصلاح المتكررة:**

```text
Pattern 1: Missing Provider
  ExpensesPage, IncomePage render بدون MemoryRouter/QueryClient
  → لف في renderPage() helper

Pattern 2: Responsive Duplicates
  jsdom يُظهر md:hidden + hidden md:block معاً
  → getAllByText بدل getByText

Pattern 3: Mock Shape Mismatch
  BylawsViewPage يستخدم useBylaws
  BylawsPage يستخدم useBylawsList + useCreateBylaw...
  → مطابقة exports المحاكاة مع الفعلي

Pattern 4: Label Drift
  "إجمالي العمليات" vs "عدد العمليات"
  → قراءة المصدر ومطابقة النص
```

