

# تقرير الفحص الجنائي الهجين الشامل — 10 محاور

بناءً على فحص معمّق للكود والقاعدة وEdge Functions وRLS والفهارس.

---

## النتائج: ما هو سليم (ملخص سريع)

| المحور | الحالة |
|---|---|
| RBAC (4 أدوار) | ✅ سليم |
| RLS تقييدية على 25+ جدول | ✅ سليم |
| Audit Log محمي (لا حذف/تعديل) | ✅ سليم |
| Rate Limiting ذري (guard-signup) | ✅ سليم |
| PII مشفر AES-256 + تمويه | ✅ سليم |
| ErrorBoundary + chunk recovery | ✅ سليم |
| safeNumber في الحسابات المالية | ✅ سليم |
| Idle Timeout 15 دقيقة + تحذير | ✅ سليم |
| فهارس قاعدة البيانات | ✅ شاملة (40+ فهرس) |
| Security views (security_invoker + security_barrier) | ✅ سليم |
| Input validation في Edge Functions | ✅ سليم |
| Rollback عند فشل تعيين الدور | ✅ سليم |
| Self-role-change prevention | ✅ سليم |
| Soft-delete للمستفيدين مع توزيعات | ✅ سليم |
| 600+ اختبار ناجح | ✅ سليم |

---

## المشاكل والملاحظات المكتشفة

### 🔴 مشكلة 1: CORS — الدومين المنشور مفقود

ملف `supabase/functions/_shared/cors.ts` يحتوي:
```
ALLOWED_ORIGINS = [
  "https://waqf-mr.lovable.app",      ← الدومين القديم
  "https://waqf-wise.net",
  "https://www.waqf-wise.net",
]
```

**المشكلة**: الدومين المنشور الحالي `https://waqf-wise-net.lovable.app` **غير موجود** في القائمة. إذا استخدمه أي مستخدم، ستفشل جميع Edge Functions بخطأ CORS.

**الإصلاح**: إضافة `"https://waqf-wise-net.lovable.app"` إلى `ALLOWED_ORIGINS`.

---

### 🟡 ملاحظة 2: Security Definer View (تحذير Supabase Linter)

فحص الأمان يُظهر تحذير `SUPA_security_definer_view`. هذا تحذير عام من Supabase Linter لأن الـ Views تستخدم `has_role()` وهي `SECURITY DEFINER` function.

**الواقع**: كلا الـ View (`beneficiaries_safe` و `contracts_safe`) يستخدمان `security_invoker=true` + `security_barrier=true` (تم التحقق من `pg_class.reloptions`). هذا يعني أن RLS تُطبّق بسياق المستخدم المستدعي. التحذير **إيجابي كاذب** ويمكن تجاهله.

---

### 🟡 ملاحظة 3: Extension في Schema العام

التحذير `SUPA_extension_in_public` يشير إلى أن `pgcrypto` مثبت في `public` schema. هذه ممارسة مقبولة لمشاريع Lovable Cloud ولا تشكل خطراً أمنياً فعلياً.

---

### 🟢 ملاحظة 4: حد الـ 1000 سجل في useContractsByFiscalYear

عند اختيار "جميع السنوات" يتم تطبيق `limit(1000)`. هذا سلوك مقصود مع تحذير toast عند الوصول للحد في `useCrudFactory`. لا يوجد خطأ لكن يجب التأكد من أن المستخدم يعرف ذلك.

---

## الخطة المقترحة

| # | الإصلاح | الأولوية | الملفات |
|---|---|---|---|
| 1 | إضافة `https://waqf-wise-net.lovable.app` لقائمة CORS | 🔴 حرجة | `supabase/functions/_shared/cors.ts` |
| 2 | توثيق تجاهل تحذيرات Linter الإيجابية الكاذبة | 🟡 منخفضة | لا تغيير في الكود |

**تعديل واحد فقط مطلوب** — إصلاح CORS بإضافة سطر واحد.

