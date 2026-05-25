# إصلاح القائمة الجانبية للناظر — خطة مُصححة بعد الفحص الجنائي

## ⚠️ تصحيح حرج للخطة السابقة

التقرير الأصلي وخطّتي الأولى ادّعا أن **تعديل `allAdminLinks[].label` كافٍ**. هذا **خطأ**. الفحص الفعلي لـ `useNavLinks.ts` السطر 70-74 كشف:

```ts
const labelKey = linkLabelKeys[link.to];
return { ...link, label: (labelKey && menuLabels[labelKey]) || link.label };
```

أي **التسمية الفعلية المعروضة في القائمة الجانبية تُؤخذ من `menuLabels[labelKey]` (المصدر = `defaultMenuLabels` في `src/types/navigation.ts` أو override من `app_settings`)**، و`link.label` في `allAdminLinks` مجرد **fallback عند غياب labelKey**.

### دليل ملموس على أن التقرير الأصلي غير دقيق
- `/beneficiary` في `allAdminLinks` مكتوبة `"معاينة واجهة المستفيد"` (سطر 59) لكن `labelKey = beneficiary_view`، و`defaultMenuLabels.beneficiary_view = 'واجهة المستفيد'`. **ما يراه الناظر فعلياً هو "واجهة المستفيد" — لا "معاينة واجهة المستفيد"**.
- `/dashboard/annual-report` يعرض `"المحتوى السنوي للوقف"` من `defaultMenuLabels.annual_report`، لكن **رأس الموبايل/breadcrumb يعرض `"التقرير السنوي"`** من `ADMIN_ROUTES['/dashboard/annual-report'].title`. **تعارض موجود مسبقاً ومخفي**.

### مصادر التسمية الثلاثة التي يجب مزامنتها
| المصدر | الملف | يُستخدم في |
|---|---|---|
| `defaultMenuLabels[labelKey]` | `src/types/navigation.ts` | القائمة الجانبية (التسمية الفعلية) |
| `ADMIN_ROUTES[route].title` | `src/constants/routeRegistry.ts` | رأس الموبايل، breadcrumbs، `ROUTE_TITLES` |
| `allAdminLinks[].label` | `src/constants/navigation.ts` | fallback فقط — يظهر للمسارات بلا labelKey |

تجاهل أي منها = تعارض مرئي بين السايدبار والرأس.

---

## الملفات المعدَّلة (4 ملفات، لا واحد)

### 1) `src/types/navigation.ts` — تحديث `defaultMenuLabels` (مصدر التسمية الفعلي)
| المفتاح | من | إلى |
|---|---|---|
| `reports` | `التقارير والإفصاح` | **`التقارير المالية والإفصاح`** |
| `accounts` | `الحسابات الختامية والإقفال` | **`الحسابات الختامية`** |
| `annual_report` | `المحتوى السنوي للوقف` | **`إدارة التقرير السنوي`** |
| `zatca` | `إدارة ZATCA` | **`تكامل ZATCA`** |
| `invoices` | `الفواتير` | **`فواتير العقود`** |
| `beneficiary_view` | `واجهة المستفيد` | **`معاينة بوابة المستفيد`** |

### 2) `src/constants/routeRegistry.ts` — مزامنة `ADMIN_ROUTES[route].title`
نفس التسميات أعلاه — لمنع تعارض القائمة الجانبية مع رأس الصفحة في الموبايل و breadcrumbs:
- `/dashboard/reports.title` → `التقارير المالية والإفصاح`
- `/dashboard/accounts.title` → `الحسابات الختامية`
- `/dashboard/annual-report.title` → `إدارة التقرير السنوي`
- `/dashboard/zatca.title` → `تكامل ZATCA`
- `/dashboard/invoices.title` → `فواتير العقود`

### 3) `src/constants/navigation.ts` — التجميع والأيقونات
**أ. `allAdminLinks` (تحديث الأيقونات + fallback labels):**
- `/dashboard/invoices`: `icon: FileText → ReceiptText` (إزالة التكرار مع `/dashboard/contracts`)
- مزامنة `label` الـ fallback مع التسميات الجديدة (نظافة فقط، فلن يُعرض ما دام labelKey موجوداً)

**ب. `ADMIN_GROUP_ORDER` + `ADMIN_GROUP_LABELS`:**
```ts
ADMIN_GROUP_ORDER = ['operations', 'finance', 'reference', 'communication', 'administration', 'system', 'preview']
ADMIN_GROUP_LABELS = {
  operations: 'التشغيل',
  finance: 'المالية والتقارير',   // كان 'المالية'
  reference: 'المرجع',
  communication: 'الاتصال',
  administration: 'الإدارة',
  system: 'النظام والتكاملات',    // كان 'النظام'
  preview: 'المعاينة',             // جديد
}
```

**ج. `ADMIN_ROUTE_GROUPS` — إصلاح اليتامى وإعادة التصنيف:**
| المسار | من | إلى |
|---|---|---|
| `/dashboard/invoices` | `operations` | **`finance`** |
| `/dashboard/chart-of-accounts` | `reference` | **`finance`** |
| `/dashboard/annual-report` | `finance` | **`reference`** |
| `/dashboard/comparison` | _(يتيم)_ | **`finance`** |
| `/beneficiary` | _(يتيم)_ | **`preview`** |

### 4) `src/constants/navigationIcons.ts` — إضافة `ReceiptText`
re-export من `lucide-react` (نمط الملف الحالي).

---

## الهيكل النهائي (الناظر — مستند للتحقق من useNavLinks بعد التطبيق)

```text
الرئيسية                         ← _top

التشغيل
  • العقارات
  • العقود
  • المستفيدين

المالية والتقارير
  • الدخل
  • المصروفات
  • فواتير العقود          (إيقونة ReceiptText)
  • الحسابات الختامية
  • التقارير المالية والإفصاح
  • الشجرة المحاسبية
  • المقارنة التاريخية

المرجع
  • اللائحة التنظيمية
  • إدارة التقرير السنوي

الاتصال
  • المراسلات
  • الدعم الفني

الإدارة
  • إدارة المستخدمين
  • الإعدادات

النظام والتكاملات
  • سجل المراجعة
  • تكامل ZATCA
  • تشخيص النظام
  • مراقبة البريد

المعاينة
  • معاينة بوابة المستفيد
```

---

## خارج النطاق (مع تبرير)
- لا تعديل على routes أو حراس الصلاحيات.
- لا تعديل على `ACCOUNTANT_EXCLUDED_ROUTES` — المحاسب يبقى محجوباً عن: users, settings, zatca, diagnostics, email-monitor, comparison, beneficiary preview (مؤكَّد من سطر 167).
- لا نقل "معاينة بوابة المستفيد" إلى داخل صفحة المستفيدين (تأجيل).
- لا تعديل على `allBeneficiaryLinks` — تسميات المستفيد سليمة وموحَّدة فعلياً.

## ملاحظة على `app_settings.menu_labels` (override من قاعدة البيانات)
إذا كان الناظر قد عدّل التسميات يدوياً من شاشة الإعدادات (تخزَّن في `app_settings` كـ JSON)، فإن `useNavLinks` يقرأها عبر `getJsonSetting('menu_labels', defaultMenuLabels)` — أي **القيم في DB ستبقى وتطغى على defaults الجديدة**. هذا سلوك متعمَّد ولا يحتاج تعديل. التغيير يطبّق على المستخدمين الذين لم يخصّصوا.

## التحقق بعد التنفيذ
1. `vitest run src/test/navLinksFiltering.test.tsx src/test/permissionsParity.test.ts src/test/navLinksParity.test.ts` — يجب أن تمر بدون تعديل (لا اختبارات تربط بتسميات نصية).
2. تسجيل دخول admin: تأكيد أن "الرئيسية" وحدها في `_top`، وأن "معاينة بوابة المستفيد" أسفل القائمة تحت قسم "المعاينة"، وأن "المقارنة التاريخية" + "الشجرة المحاسبية" + "فواتير العقود" تحت "المالية والتقارير".
3. فتح صفحة `/dashboard/annual-report` على عرض الموبايل والتأكد من تطابق رأس الصفحة مع اسم القائمة ("إدارة التقرير السنوي") — هذا اختبار التعارض المخفي الذي كانت الخطة السابقة ستتركه دون حل.
4. تسجيل دخول accountant والتأكد من اختفاء: comparison, users, settings, zatca, diagnostics, email-monitor, beneficiary preview.
