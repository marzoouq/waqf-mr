
## R11 — تحقق مزدوج: **لا توجد مشكلة، الـ finding كاذب**

### الادعاء (يتكرر في كل scan)

> سياسة `Authenticated users can view invoices` (تنطبق على `{public}`، تتحقق من `auth.role() = 'authenticated'`) تمنح كل مستخدم مسجَّل قراءة كل ملفات `invoices`.

### الأدلة المباشرة من DB (3 استعلامات منفصلة)

**1) قائمة كل السياسات على `storage.objects`:**

14 سياسة فقط؛ كلها مقيَّدة بـ `has_role()` أو شروط محددة. السياسة الوحيدة لـ SELECT على `invoices`:

```
Admin and accountant can view invoice files
  cmd: SELECT  roles: {authenticated}
  qual: bucket_id='invoices' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'accountant'))
```

**2) فحص هدف بحثاً عن السياسة المزعومة:**

```sql
SELECT ... WHERE 'public' = ANY(roles)
       OR qual ILIKE '%auth.role()%'
       OR (qual ILIKE '%authenticated%' AND qual NOT ILIKE '%has_role%')
→ []  (صفر سجلات)
```

**3) عدّاد قاطع:**

| المقياس | القيمة |
|---------|--------|
| إجمالي policies على `storage.objects` | 14 |
| سياسات باسم يحوي "authenticated users" | **0** |
| سياسات تستخدم `auth.role()` في qual | **0** |
| bucket `invoices` public | **false** |

### الاستنتاج النهائي

- السياسة المزعومة **غير موجودة** في القاعدة الحية.
- bucket `invoices` خاص.
- المستفيد/الواقف **لا يستطيعان** قراءة ملفات الفواتير (لا سياسة SELECT تسمح لهما).
- الـ finding مصدره `supabase_lov` scanner v3.2 — يبدو أنه يقرأ من **cache قديم** لم يُحدَّث بعد R5 (الذي شدّد سياسات invoice storage).

### الإجراء في R11 — توثيق فقط

1. إنشاء `audit/forensic-2026-06-17/R11-VERIFICATION.md` يحوي:
   - الاستعلامات الثلاثة والنتائج.
   - استنتاج: إيجابي كاذب من scanner cache stale.
   - توصية: تجاهل هذا الـ finding في كل scan لاحق حتى يُحدَّث scanner cache.
2. تحديث `audit/forensic-2026-06-17/R10-EXECUTED.md` §4 من "اكتشاف R11" → "إيجابي كاذب موثَّق في R11-VERIFICATION.md".

**لا migration. لا تعديل على policies. لا تغيير على Edge Functions.**

### بنود ثانوية (اختياري — أنتظر تأكيدك)

- إصلاح الـ2 خطأ ESLint السابقين في `src/hooks/application/useAiChat.ts` (`react-hooks/immutability` — لا علاقة بـ R10/R11). يحتاج إعادة هيكلة بسيطة (تمرير setters بدلاً من refs قابلة للتعديل).

### المخاطر

- ❌ لا مخاطر — لا تغييرات تنفيذية، توثيق فقط.
