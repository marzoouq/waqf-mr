# خطة: تحقق تكامل + تنظيف F17–F26

## الجزء 1 — فحص تكامل (قراءة فقط، قبل التعديل)

وكيل واحد متوازي `spawn_agent` يكتب `audit/forensic-2026-06-22/INTEGRATION-CHECK.md` يغطي:

1. **المسارات** — كل 41 route في `ROUTE_ROLES` ↔ `adminRoutes/beneficiaryRoutes/waqifRoutes/publicRoutes` (لا route يتيم/مكرر).
2. **التبويبات** — كل `<Tabs>` في `src/pages` و`src/components`: تطابق `TabsTrigger.value` ↔ `TabsContent.value`.
3. **روابط التنقل** — `bottomNavLinks`, `Sidebar`, كل `<NavLink>/<Link to=...>` يطابق route موجوداً.
4. **الهوكات** — كل صفحة: data hooks → tables → edge functions (تحقق من invoke names).
5. **الطباعة/PDF** — `generate-invoice-pdf`, `generate-voucher-pdf`, خطوط `Amiri/Tajawal` مضمّنة، استدعاءات jsPDF في الصفحات.
6. **التأثير الانحداري** — تحقق أن تغييرات F1/F15 (حذف سياسات storage) لم تكسر تنزيل ملفات الفواتير لدى admin/accountant/beneficiary/waqif.
7. **build + tests** — `npm run audit` + `vitest run` بشكل سريع.

التقرير يصدر بصيغة جدول: [Area | Status ✓/✗ | Evidence | Action].

## الجزء 2 — تنفيذ F17–F26

| ID | التغيير | الملف |
|----|---------|-------|
| F17 | `#0f172a` → `hsl(var(--foreground))` | `src/components/.../SignaturePad.tsx:61` |
| F18 | استبدال 6 ألوان hex متبقية بـ tokens (`hsl(var(--*))`) — حسب مسح M5 | ملفات UI متعددة |
| F19 | توثيق/حذف 7 hooks ميتة في `src/hooks/data/**` | إضافة JSDoc `@deprecated` أو حذف بعد التأكد |
| F20 | توحيد 5 query keys نصية خام بـ key factories | hooks/data المتأثرة |
| F21 | `REAL_KEY` → `MOCK_KEY` | `supabase/functions/_shared/auth.test.ts:4` |
| F22 | تقليل تفاصيل خطأ HIBP | `supabase/functions/guard-signup/index.ts:135` |
| F23 | إضافة أيقونات أو تعليق توثيقي | `audit-report-final`, `cleanup-report` routes/nav |
| F24 | تأكيد توثيقي فقط (bucket عام مقصود) | `docs/security/views.md` |
| F25 | تأكيد توثيقي (CORS `*` في `auth-email-hook`) | تعليق رأس الملف |
| F26 | إضافة ملاحظة في خطة المراقبة | `docs/diagnostics/troubleshooting-playbook.md` |

### قواعد التنفيذ
- لا تغيير سلوكي — فقط استبدال tokens/تسميات/تعليقات.
- لكل ملف يُلمس: قراءة كاملة أولاً، استبدال دقيق عبر `line_replace`.
- لو وُجدت بعد المسح ألوان hex إضافية، أضيفها لنفس الجولة.

## الجزء 3 — تحديث التوثيق وملخص التغييرات

- إنشاء `audit/forensic-2026-06-22/CHANGELOG-EXECUTION.md`: قائمة F1→F26 مع الحالة (✅ منفّذ / ⚪ false positive / ⏭ مؤجل) ومرجع migration/commit.
- تحديث `FORENSIC-REPORT.md` §5: شطب البنود المنفّذة.
- تحديث `.lovable/plan.md` بنتيجة V2.

## التحقق النهائي
1. `npm run audit` — صفر critical/GAP جديدة.
2. `vitest run` — لا اختبارات منكسرة.
3. قراءة `INTEGRATION-CHECK.md` — صفر ✗.
4. ملخص قصير في الرد بأبرز ما تغيّر.

## ما لن يُنفَّذ
- لا migrations جديدة في هذه الجولة (تغييرات DB انتهت).
- لا تعديل سلوكي على Edge Functions (فقط تسميات/تعليقات).
- لا حذف ملفات قبل تأكيد عدم استخدامها (F19 يبدأ بـ `@deprecated`).
