# خطة T14 — دمج 340 Migration في Baseline واحد

> **حالة:** مُعدّة وغير منفّذة. تتطلب نافذة صيانة وموافقة الناظر.
> **آخر تحديث:** 2026-05-28

## السياق
- عدد ملفات migrations الحالية: **340 ملف** في `supabase/migrations/`
- النطاق الزمني: من `20260209105205` إلى `20260528004128`
- المشكلة: بطء استرجاع نسخ البيئات الجديدة، صعوبة تتبع التاريخ، وزن المستودع
- الهدف: استبدال 340 ملف بـ baseline واحد يمثل الحالة النهائية لقاعدة البيانات الحالية، مع أرشفة الملفات الأصلية

## المخاطر الحرجة
1. **فقدان البيانات** إذا اختلف baseline عن Live حتى في تفصيل صغير
2. **كسر مرجعية Supabase** لتاريخ migrations (جدول `supabase_migrations.schema_migrations`)
3. **عدم اتساق بين Test و Live** إذا نُفّذت العملية على إحداهما فقط
4. **استحالة rollback السهل** بعد التطبيق
5. **تعطّل النشر التالي** إذا لم تُحدّث مرجعية Supabase CLI

## المتطلبات الإلزامية قبل التنفيذ
- [ ] نسخة احتياطية كاملة من Live DB (logical + physical) محفوظة خارجياً
- [ ] نسخة احتياطية كاملة من Test DB
- [ ] تصدير `supabase_migrations.schema_migrations` كمرجع
- [ ] نافذة صيانة لا تقل عن ساعتين خارج ساعات الذروة
- [ ] موافقة صريحة من الناظر مع توقيع زمني
- [ ] بيئة dev منفصلة لاختبار baseline من الصفر

## الخطوات التفصيلية

### المرحلة 1 — توليد Baseline (محلياً)
```bash
# تصدير schema الحالي من Live بصيغة pure SQL
supabase db dump --schema public,auth,storage --data=false > /tmp/baseline_schema.sql

# تصدير بيانات الجداول المرجعية فقط (roles, settings, etc.) بدون بيانات تشغيلية
supabase db dump --schema public --data-only \
  --table user_roles --table app_settings \
  > /tmp/baseline_seed.sql
```

### المرحلة 2 — أرشفة Migrations القديمة
```bash
mkdir -p supabase/migrations_archive/2026-05-28
mv supabase/migrations/2026*.sql supabase/migrations_archive/2026-05-28/
# الاحتفاظ بـ README.md في المجلد الأصلي
```

### المرحلة 3 — كتابة Baseline الجديد
- اسم الملف: `supabase/migrations/20260528000000_baseline.sql`
- محتوى: schema كامل + GRANTs + RLS + functions + triggers + seed مرجعي
- يجب أن يحتوي تعليق header يوضح:
  - تاريخ التوليد
  - الـ migrations المؤرشفة (340 ملف)
  - hash من schema الأصلي للتحقق

### المرحلة 4 — مزامنة سجل Supabase
```sql
-- في Live و Test:
-- حذف السجلات القديمة من supabase_migrations.schema_migrations
DELETE FROM supabase_migrations.schema_migrations
  WHERE version < '20260528000000';

-- إدراج baseline كمنفّذ (لأن schema موجود فعلياً)
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
  VALUES ('20260528000000', 'baseline', ARRAY['-- baseline applied manually']);
```

### المرحلة 5 — التحقق
1. تشغيل `supabase db diff` — يجب ألا يظهر أي فرق
2. تشغيل suite الاختبارات الكامل (`bunx vitest run`)
3. تشغيل `supabase--linter` للتأكد من عدم وجود تراجعات أمنية
4. اختبار تشغيل baseline من الصفر في بيئة dev نظيفة
5. التحقق من عمل جميع Edge Functions

### المرحلة 6 — Rollback Plan
إذا فشل أي تحقق:
```bash
# استعادة الملفات الأصلية
mv supabase/migrations_archive/2026-05-28/*.sql supabase/migrations/
rm supabase/migrations/20260528000000_baseline.sql

# استعادة سجل Supabase من النسخة الاحتياطية
psql $DATABASE_URL < /backup/schema_migrations_backup.sql
```

## معايير القبول
- ✅ عدد الملفات في `supabase/migrations/`: 1 (baseline) + README
- ✅ `supabase db diff` يُرجع فارغ
- ✅ جميع الاختبارات تمر (0 failures)
- ✅ Live يعمل بدون أي تأثير ملحوظ على المستخدمين
- ✅ بيئة dev جديدة تُبنى من baseline في < 30 ثانية

## قرار التنفيذ
لا تُنفّذ هذه الخطة من قبل Lovable تلقائياً. تتطلب:
1. تشغيل يدوي من الناظر مع إشراف فني
2. تأكيد النسخ الاحتياطية قبل البدء
3. إعلان نافذة صيانة للمستخدمين

## بدائل أخف وزناً (يُنصح بها قبل T14 الكامل)
- **T14a:** أرشفة migrations أقدم من 6 أشهر فقط (~150 ملف) دون توليد baseline موحّد
- **T14b:** إضافة `.gitattributes` لضغط migrations القديمة في git history
- **T14c:** تأجيل T14 حتى الوصول لـ 500+ ملف
