# تقرير HTML للفحص + اختبار حارس لنمط الاستيراد

## النطاق

ثلاثة بنود متكاملة، كلها **خارج كود التطبيق** (لا route جديد، لا UI، لا RLS):

1. مولّد تقرير HTML ثابت تحت `audit/report.html` يجمع نتائج كل سكربتات الـ audit.
2. اختبار Vitest حارس يمنع رجوع الانتهاكات الحرجة.
3. تأكيد شامل أن نمط الربط في الصفحات والهوكات يطابق `Core Modularization v7`.

## 1) مولّد تقرير HTML — `scripts/build-audit-report.mjs`

سكربت Node ESM (قراءة فقط) يقرأ:
- `audit/structure-inventory.csv`
- `audit/conventions-deep-violations.csv` + `conventions-deep-report.md`
- `audit/hooks-layout-report.md`
- `audit/page-controls-audit.csv` + `page-controls-audit.md`
- `audit/ui-permissions-matrix.csv` + `ui-permissions-audit.csv`
- `audit/role-controls-review.md`

ويولّد `audit/report.html` صفحة واحدة قائمة بذاتها (لا CDN، CSS مضمّن، RTL عربية، نفس متغيرات HSL الخفيفة):

**الهيكل:**
- شريط جانبي (Sidebar) فيه روابط داخلية: ملخص تنفيذي · الانتهاكات الحرجة · الجرد الهيكلي · الصفحات (39) · الهوكات · الصلاحيات · Edge Functions.
- بطاقات إحصائيات في الأعلى: عدد الملفات، الانتهاكات Critical/Warning/Info، GAPs.
- جداول قابلة للفرز والتصفية بـ vanilla JS (لا اعتمادات):
  - جدول **الصفحات** (39 صفحة): اسم، مسار، الأدوار، الهوك المرتبط، عدد التبويبات/الأزرار، LOC، حالة (✅/⚠/🔴).
  - جدول **الانتهاكات** مفلتر بالخطورة والقاعدة.
  - جدول **الهوكات > 200 سطر**.
- شريط بحث علوي يصفّي جميع الجداول معاً.
- زر "تنزيل CSV" لكل جدول (export from in-memory data).

**التشغيل:** يُضاف script `audit:report` في `package.json` يستدعي السكربت.

## 2) اختبار حارس — `src/test/auditCriticalGate.test.ts`

اختبار Vitest يُشغّل سكربتات الـ audit عبر `execFileSync` ويفحص النتائج:

```ts
describe('Audit critical gate', () => {
  it('conventions-deep-violations.csv has 0 Critical rows', () => {
    execFileSync('node', ['scripts/audit-conventions-deep.mjs']);
    const csv = readFileSync('audit/conventions-deep-violations.csv', 'utf8');
    const criticals = csv.split('\n').filter(l => l.startsWith('Critical,'));
    expect(criticals).toEqual([]);
  });

  it('hooks-layout-report.md has no Critical issues', () => { ... });

  it('page-controls-audit has 0 GAP-NO-HANDLER', () => { ... });

  it('ui-permissions-audit has 0 GAP rows', () => { ... });

  it('no page imports from @/hooks/data/* (non-type)', () => {
    // فحص مباشر لكل ملف في src/pages/** بنفس regex السكربت
  });

  it('no hook in src/hooks/data/** imports sonner', () => { ... });

  it('no utils/ file imports supabase or sonner', () => { ... });
});
```

هذا يربط الفحوصات بـ CI/`bunx vitest run` تلقائياً ويمنع أي رجوع.

## 3) تأكيد شامل لنمط الربط

- تشغيل `node scripts/audit-conventions-deep.mjs` + `audit-hooks-layout.mjs` + `audit-structure.mjs` + `audit-ui-permissions.mjs` + `audit-page-controls.mjs` بعد بناء التقرير.
- مراجعة قسم "الصفحات" في `audit/report.html` للتأكد أن كل صفحة من الـ 39 لها هوك مرتبط في `hooks/page/` أو `hooks/application/` وأن عمود "الاستيرادات المخالفة" = 0 لكل سطر.
- تحديث `audit/structure-deep-review.md`: بند P0 = ✅، إضافة رابط للتقرير الجديد ولاختبار الحارس.

## معايير القبول

- `audit/report.html` يُفتح في أي متصفح بدون اتصال إنترنت، RTL، CSS داخلي، JS بدون اعتمادات.
- `bunx vitest run src/test/auditCriticalGate.test.ts` ينجح كاملاً.
- جميع الفحوصات السابقة تبقى خضراء (`lint:conventions`, `audit-ui-permissions`, `audit-page-controls`, `security-gates`).

## الاستبعادات

- لا route جديد في التطبيق ولا تعديل Sidebar/Layout.
- لا تغيير على `hooks/`, `pages/`, RLS، migrations، أو ملفات محمية.
- لا اعتماد npm جديد.
- بنود Info الحالية (ألوان Canvas، 3 hooks > 200 سطر) ستظهر في التقرير كملاحظات بدون اعتبارها فشلاً.

## تفاصيل تقنية

- اللغة: Node ESM، يطابق `scripts/*.mjs` الموجودة.
- HTML بـ template strings في السكربت، CSS بمتغيرات HSL تطابق `index.css`.
- وقت توليد التقرير المتوقع: < 2 ثانية على 1201 ملف.
