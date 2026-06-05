## الهدف
أتمتة تشغيل سكربتات audit + توليد `audit/report.html` + اختبار البوابة الحرجة قبل كل `push`، بحيث لا يمر أي انتهاك حرج إلى المستودع.

## النطاق
تغييرات أدوات/توثيق فقط. لا تعديل على منطق التطبيق ولا الـ DB ولا الـ RLS ولا الملفات المحمية.

## الخطوات

1. **سكربت موحّد `scripts/audit-all.mjs`**
   - يشغّل بالتتابع: `audit-structure` → `audit-conventions-deep` → `audit-hooks-layout` → `audit-ui-permissions` → `audit-page-controls` → `build-audit-report`.
   - يطبع ملخصاً نهائياً (عدد Critical / GAP / Info) ويُرجع exit code ≠ 0 عند وجود Critical/GAP.

2. **scripts في `package.json`**
   - `"audit": "node scripts/audit-all.mjs"`
   - `"audit:gate": "vitest run src/test/auditCriticalGate.test.ts"`
   - (لا إضافة تبعيات جديدة)

3. **Husky pre-push hook** (`.husky/pre-push`)
   - إن لم يكن husky مثبّتاً مسبقاً، أكتفي بإنشاء سكربت `scripts/install-git-hooks.sh` يَنسخ hook خام إلى `.git/hooks/pre-push` يدوياً، مع توثيق التفعيل في README.
   - الـ hook يشغّل: `npm run audit && npm run audit:gate`.
   - عند الفشل: يطبع رسالة عربية واضحة بالملف/السطر ويمنع الـ push.

4. **توثيق `CONTRIBUTING.md`**
   - قسم جديد "بوابة Audit قبل الدفع" يشرح الأمرين، مكان `audit/report.html`، وكيفية تثبيت الـ hook محلياً.

5. **تحديث `audit/structure-deep-review.md`**
   - إضافة قسم "آلية الإنفاذ" يربط البوابة بنمط Page Hook + CoreModV7.

## معايير القبول
- `npm run audit` يُنهي بنجاح ويُولّد `audit/report.html` محدّثاً.
- `npm run audit:gate` يعطي PASS مع 0 Critical و 0 GAP.
- تشغيل `.husky/pre-push` يدوياً يمنع push عند زرع انتهاك تجريبي ويسمح به بعد إصلاحه.
- لا تغييرات على: `src/integrations/**`, `supabase/config.toml`, `supabase/migrations/**`, أي صفحة/هوك تطبيقي.

## خارج النطاق
- إنشاء route داخل التطبيق لعرض التقرير.
- معالجة تحذيرات Info (تقسيم hooks > 200 سطر، ألوان Canvas/PDF).
- ربط GitHub Actions (يمكن إضافته لاحقاً بنفس الأمرين).