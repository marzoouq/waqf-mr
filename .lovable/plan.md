# التحقق الجنائي الإضافي — قائمة الناظر (الجولة 2)

كل بند أدناه مُتحقَّق منه بفحص الكود مباشرةً في هذه الجولة. النتائج الجديدة بخط عريض.

---

## أ) النتائج الجنائية الجديدة (أعمق من الجولة 1)

### A1 — اقتران صلاحيات خفي بين `accounts` و `distributions`
**ملف**: `src/constants/routeRegistry.ts`
- `/dashboard/accounts` → `permKey: 'accounts'`
- `/dashboard/distributions` → `permKey: 'accounts'` ← **نفس المفتاح**

**الأثر**: عند سحب صلاحية `accounts` من المحاسب (أو أي دور)، يختفي `distributions` تلقائيًا. لا يوجد تحكم مستقل. هذا تكرار صلاحية صامت لم يُذكر في الجولة 1.

### A2 — 8 مسارات بدون `permKey` (تحكم وصول هش)
المسارات التالية مسجَّلة في `ADMIN_ROUTES` بدون `permKey`:
`users`, `settings`, `zatca`, `comparison`, `diagnostics`, `email-monitor`, `audit-report-final`, `cleanup-report` + `/dashboard` نفسه.

**الأثر**: في `filterLinksByPermissions` (utils/auth/filterByVisibility.ts:43)، إذا كان `permKey` غير معرَّف → الرابط **يظهر دائمًا**. هذا يعني أن الحاجز الوحيد لمنع المحاسب من رؤية هذه المسارات هو القائمة الثابتة `ACCOUNTANT_EXCLUDED_ROUTES`. **أي مسار جديد بدون permKey سيُسرَّب للمحاسب** افتراضيًا.

### A3 — `/beneficiary` (معاينة) في قائمة الناظر بلا قيد قسم
- مسجَّل في `BENEFICIARY_ROUTES` فقط، غير موجود في `ADMIN_ROUTES`.
- نتيجة: `ADMIN_ROUTE_TO_SECTION['/beneficiary'] = undefined`.
- في `filterLinksBySectionVisibility` (utils/auth/filterByVisibility.ts:26) → "افتراض آمن: يبقى ظاهراً".
- **لا يمكن للناظر إخفاء "معاينة بوابة المستفيد" عبر إعدادات الأقسام**، لأنها لا تملك مفتاح قسم في خريطة الناظر.

### A4 — `audit-report-final` و `cleanup-report` بلا `labelKey`
- المسارات الأخرى تُعرَّب تسمياتها ديناميكيًا عبر `menu_labels` من `useAppSettings`.
- هذان الرابطان نصوصهما **مكتوبة في الكود فقط** (`'تقرير التدقيق النهائي'`, `'تقرير التنظيف'`) — لا يستطيع الناظر تغييرها من إعدادات الواجهة.

### A5 — مطابقة كاملة بين القائمة والمسارات (لا روابط/صفحات يتيمة)
```
nav admin links → routes: 100% match (25/25)
routes → nav: 100% match
pages → routes: 100% match (الـ ORPHAN PAGES الـ9 كلها .test.tsx فقط)
```
**نفي للقلق**: لا يوجد ربط ميت ولا صفحة منتجة بلا مسار.

### A6 — سلوك SidebarNavList مع مجموعة `preview` (عنصر واحد)
**ملف**: `src/components/layout/sidebar/SidebarNavList.tsx:80`
```tsx
{groups.map((group, idx) => (
  <div className={cn(idx > 0 && 'mt-3 pt-2 border-t border-sidebar-border/40')}>
```
- المجموعة الأخيرة (`preview`) ترسم **خطًا فاصلًا كاملًا قبل رابط واحد فقط**.
- ضوضاء بصرية مؤكَّدة، ليست افتراضية.

### A7 — التطابق بين `routeRegistry` و `allAdminLinks` مكسور جزئيًا
- `allAdminLinks` (navigation.ts:37-63) **مكتوب يدويًا** برغم وجود `ADMIN_ROUTES` في السجل الموحَّد.
- ترتيب الروابط في `allAdminLinks` لا يتطابق مع ترتيب `ADMIN_ROUTES`.
- إضافة مسار في السجل لا تُضيفه للقائمة الجانبية تلقائيًا — يلزم تحديث ملفين.
- **تناقض مع هدف التعليق في `routeRegistry.ts:5`** ("مصدر واحد للحقيقة").

### A8 — `linkLabelKeys` يُبنى من السجل، لكن `allAdminLinks` لا
- navigation.ts:31-34 تبني `linkLabelKeys` من `buildLabelKeys(ADMIN_ROUTES)` ✓
- لكن قائمة الروابط نفسها (`allAdminLinks`) ثابتة. عدم اتساق معماري.

---

## ب) تأكيد نتائج الجولة 1 (لم تتغير)

| البند | الحالة |
|---|---|
| 25 رابط ناظر | ✓ مؤكد |
| 7 مجموعات | ✓ مؤكد |
| `Users` icon مكرر (beneficiaries + distributions) | ✓ مؤكد |
| `ShieldCheck` icon مكرر (audit-log + audit-report-final) | ✓ مؤكد |
| `preview` group بعنصر واحد | ✓ مؤكد + A6 يثبت الأثر البصري |
| `annual-report` في `reference` بدل `finance` | ✓ مؤكد |
| `finance` group بـ8 عناصر | ✓ مؤكد |
| `system` group بـ6 عناصر | ✓ مؤكد |
| ٤ مسافات بدل ٢ في الأسطر 58-59 | ✓ مؤكد |
| `audit-report-final` + `cleanup-report` تقارير جنائية لمرة واحدة | ✓ مؤكد |

---

## ج) تصنيف نهائي للمشاكل بالخطورة

| رقم | المشكلة | الخطورة | الفئة |
|---|---|---|---|
| **A1** | `distributions` و `accounts` يتقاسمان نفس `permKey` | **عالية** | أمان/تحكم |
| **A2** | 8 مسارات بدون `permKey` — حماية المحاسب تعتمد على قائمة استبعاد يدوية | **عالية** | أمان/تحكم |
| **A3** | `/beneficiary` (معاينة) غير قابل للإخفاء عبر إعدادات الأقسام | متوسطة | تحكم |
| **A4** | تسميتان غير مُعرَّبتين ديناميكيًا | منخفضة | i18n |
| **A7** | `allAdminLinks` يدوي رغم وجود سجل موحَّد | متوسطة | صيانة |
| C1 | مجموعة preview بعنصر واحد | متوسطة | UX |
| C2 | annual-report في reference | متوسطة | UX |
| C3 | تقارير جنائية دائمة في القائمة | عالية | UX |
| C4 | finance بـ8 عناصر | متوسطة | UX |
| C5 | خطأ مسافة بادئة | منخفضة | تجميلي |
| C6 | المحاسب محروم من `comparison` | متوسطة | سياسة |
| C7 | أيقونات Receipt/ReceiptText متشابهة | منخفضة | UX |
| تكرار أيقونة Users | تكرار أيقونة ShieldCheck | منخفضة | UX |

---

## د) ادعاءات سابقة لم يثبتها الفحص

- **"finance بـ7 روابط"** — خطأ، الصحيح 8.
- **"BylawsPage مكرر مع BylawsViewPage"** — خطأ، صفحات منفصلة لأدوار منفصلة.
- **"ClipboardList مكرر في قائمة الناظر"** — خطأ، الرابط الثاني في قائمة المستفيد.

---

## هـ) المخرَج النهائي المقترح

كتابة تقرير جنائي كامل تحت:
```
/mnt/documents/SIDEBAR-ADMIN-FORENSIC-2026-06-22.md
```
بهيكل:
1. **Executive Summary** (3 مخاطر عالية: A1, A2, C3).
2. **جدول التحقق الكامل** (25 رابط × 7 أعمدة: المسار، التسمية، الأيقونة، المجموعة، permKey، sectionKey، رقم سطر `routeRegistry.ts`).
3. **مصفوفة المشاكل** (A1-A8 + C1-C7) مع رقم سطر/ملف لكل واحدة.
4. **مصفوفة الأيقونات المكررة**.
5. **خريطة الصلاحيات الفعلية** بعد تطبيق `filterLinksByPermissions` للأدوار الثلاثة (admin/accountant/beneficiary).
6. **توصيات إصلاح مرتبة بالأولوية**:
   - P0 (أمان): فك اقتران A1، إضافة `permKey` مستقل لـ A2.
   - P1 (UX): تطبيق خيار B (نقل التقارير الجنائية لأرشيف).
   - P2 (UX): إعادة تجميع (دمج preview، نقل annual-report).
   - P3 (صيانة): توليد `allAdminLinks` من `ADMIN_ROUTES` تلقائيًا.

**بدون أي تعديل كود** — التقرير وحده هو المخرج.

هل أكتب التقرير الآن بهذا المحتوى المُتحقَّق جنائيًا؟
