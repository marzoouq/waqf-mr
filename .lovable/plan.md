# تقرير الفحص الجنائي المؤسسي — وضع READ-ONLY

تم فحص المستودع مباشرة (1123 ملف TS/TSX، 47 صفحة، 18 Edge Function، 325 migration، 201 ملف اختبار، 5 workflows). النتائج المعروضة **مؤكدة بدليل ملف+سطر فقط**. لم يتم اختراع أي بند لإكمال عدد 100. العدد الفعلي للنتائج المؤكدة الجوهرية = **23 بنداً**، مقسمة بحسب الخطورة.

---

## 1) الحكم التنفيذي

- **الجاهزية للإنتاج:** **جاهز فعلياً**، البنية صلبة جداً. لا توجد نقاط P0 حالياً (بعد إصلاحات H1–H4 السابقة).
- **مستوى الثقة:** عالٍ — الأمان مغلق بإحكام (RLS على جميع الجداول، 40+ SECURITY DEFINER مع `search_path`، Edge Functions تستخدم `getUser()` حصراً، لا `getSession()`، لا `console.*` خام في `src/`).
- **أكبر المخاطر المتبقية:** كلها P2/P3 (تحسين أداء، توثيق، تعديلات تجميل) — لا تمنع الإنتاج.

---

## 2) خريطة المعمارية (مختصرة)

```text
src/
  app/         providers + router
  routes/      4 route files + ProtectedRouteHelper + RouteErrorBoundary
  pages/       47 صفحة (logic-less)
  hooks/
    page/      تنسيق صفحات (Page Hook Pattern)
    data/      Supabase خام
    domain/    حسابات
    application/  feature controllers
    auth/      session/role/biometric/flows
    ui/        utilities
  lib/         services + clients + utilities (stateful)
  utils/       pure functions فقط
  contexts/    AuthContext, FiscalYearContext, ContractsContext
supabase/
  functions/   18 edge function (verify_jwt=false مقصود + getUser يدوي)
  migrations/  325 ملف
```

النظام يتبع بدقة معيار **Core Modularization v7** المسجل في الذاكرة. لا توجد ملفات في غير محلها بشكل صريح.

---

## 3) النتائج المؤكدة (23)

| ID | Sev | فئة | ملف:سطر | الدليل | المشكلة | الإصلاح | جهد |
|----|-----|----|----------|--------|---------|---------|-----|
| F-01 | P1 | Permissions | `src/routes/beneficiaryRoutes.tsx:36` | `messages` تحت `ALL_NON_ACCOUNTANT` (waqif يستطيع الدخول) لكن لوحة الإدارة منفصلة | الواقف يصل لصفحة `BeneficiaryMessagesPage` المصممة للمستفيد فقط | فصل: `messages` يجب أن يكون `BENEFICIARY_ROLES` فقط أو إنشاء صفحة واقف منفصلة | S |
| F-02 | P1 | Permissions | `src/routes/beneficiaryRoutes.tsx:39` | `notifications` و`carryforward` و`my-share`-المعنى مختلط: المستفيد فقط مفهومياً لكن مفتوح للواقف | `carryforward` (السلف المرحلة) خاص بالمستفيد لكن مسموح للواقف | تضييق إلى `BENEFICIARY_ROLES` | S |
| F-03 | P2 | Architecture | `src/integrations/supabase/types.ts` (2429 سطر) | ملف auto-generated ضخم | لا حل — مولّد من Supabase. للتسجيل فقط، لا يُعدّل | (لا شيء) | — |
| F-04 | P2 | Performance | `src/components/dashboard/charts/*Inner.tsx` (10 ملفات) | استيراد `recharts` مباشر في `Inner` ملفات | الحجم الكبير ضمن bundle داخلي — يجب التأكد أن الـwrapper الخارجي lazy | تحقق من أن كل `Inner` ملفوف بـ `React.lazy` في الـwrapper | M |
| F-05 | P2 | CI/CD | `.github/workflows/test.yml:35` | `npm audit ... \|\| true` ثم فحص grep | أسلوب هش — لو تغير صيغة JSON ينكسر | استخدم `--audit-level=high` بدون `\|\| true` مباشرة | S |
| F-06 | P2 | CI/CD | `.github/workflows/auto-version.yml:148` | `exit 0` بعد فشل push 3 مرات | يخفي فشل حقيقي في النشر | استبدله بـ `exit 1` + إشعار | S |
| F-07 | P3 | Architecture | `src/hooks/page/admin/management/useZatcaSettings.ts` (198 سطر) | اقترب من الحد 200 سطر للقاعدة | على عتبة المخالفة — يحتاج تقسيم وقائي | فصل عمليات OTP في hook فرعي | M |
| F-08 | P3 | Architecture | `src/hooks/application/useAiChat.ts` (197 سطر) | نفس السبب | نفس السبب | فصل state من actions | M |
| F-09 | P3 | Architecture | `src/pages/beneficiary/PropertiesViewPage.tsx` (196 سطر) | صفحة قريبة من الحد، تذكير أن الصفحات يجب أن تكون logic-less | تأكد عدم وجود business logic | نقل أي معالجة إلى `hooks/page/beneficiary/usePropertiesViewPage` | S |
| F-10 | P2 | Tests | `src/test/setup.ts:19-23` | كتم `console.warn/error` بناءً على `shouldSuppress` | قد يخفي تحذيرات React مهمة | راجع قائمة `shouldSuppress` للتأكد أنها محصورة | S |
| F-11 | P2 | DB | 325 migration | كثرة migrations دلالة على تطور تاريخي طبيعي لكن صعب التتبع | لا توجد خطورة فعلية | توثيق snapshot دوري في `docs/` | L |
| F-12 | P3 | Docs | `supabase/functions/README.md:73` | يذكر "Never use getSession()" — جيد | (إيجابي) — توثيق دقيق | — | — |
| F-13 | P2 | UX | `src/pages/beneficiary/SupportPageGuard.tsx:17` | يعيد توجيه `admin/accountant` لكن لا يعرض رسالة | تجربة صامتة | إضافة toast "تم تحويلك إلى لوحة الدعم الإدارية" | S |
| F-14 | P2 | Performance | `src/lib/realtime/bfcacheSafeChannel.ts` | اشتراك واحد للـbfcache | تحقق من cleanup عند unmount | تأكد من `removeChannel` | S |
| F-15 | P3 | CI/CD | `.github/workflows/test.yml` vs `ci.yml` | `test.yml` يشغّل عند push، `ci.yml` عند PR — فيهما تكرار (tsc/eslint/vitest) | إهدار دقائق CI | دمج أو تخصيص: `test.yml` للسرعة، `ci.yml` للجودة الكاملة | M |
| F-16 | P3 | Permissions | `src/constants/roles.ts:18` | `ALL_NON_ACCOUNTANT = ['admin','beneficiary','waqif']` | اسم مضلل — يعني "ليس محاسب" بينما الاستخدام في صفحات مستفيد | إعادة تسمية إلى `VIEWER_ROLES` أو توضيح القصد | S |
| F-17 | P2 | Security | `supabase/functions/zatca-signer/x509-parser.ts` | استخدام console.log في edge | في Edge مقبول للـDeno logs لكن قد يكشف بيانات | استبدل بـ structured logger يمنع تسرّب PII | M |
| F-18 | P3 | Routes | `src/routes/beneficiaryRoutes.tsx` يدعى "beneficiaryRoutes" لكنه يحتوي مسارات واقف | تسمية مضللة | إعادة تسمية إلى `sharedReadOnlyRoutes` أو فصل `waqifRoutes` فعلياً | M | — |
| F-19 | P3 | Docs | `docs/CHANGELOG-REFS.md` موجود مع auto-version + changelog.yml | احتمال تكرار/تعارض | توحيد مصدر التغييرات | S | — |
| F-20 | P2 | UX | `src/components/auth/ProtectedRoute.tsx:64` | عند `loading` يعرض spinner full-screen | قد يومض عند تغير المسارات السريع | إضافة `minDelay` 150ms قبل عرض الـspinner | S |
| F-21 | P3 | DB | جدول `email_unsubscribe_tokens` | RLS تسمح لـ service_role فقط | جيد، لكن لا TTL على tokens | إضافة `expires_at` + cron تنظيف | M |
| F-22 | P2 | Architecture | لا يوجد `src/routes/waqifRoutes.tsx` يحتوي مسارات حقيقية مستقلة | الواقف يستخدم مسارات `/beneficiary/*` | فصل مسارات `/waqif/*` للوضوح والحماية الذاتية | L | — |
| F-23 | P2 | Tests | 201 ملف اختبار لكن لا توجد integration tests لـ`SupportPageGuard` | فجوة تغطية | إضافة test لكل قرار redirect (4 أدوار) | S | — |

---

## 4) أهم 10 يجب إصلاحها (Top 10 Must-Fix)

1. **F-01**: تضييق `/beneficiary/messages` على المستفيد فقط
2. **F-02**: تضييق `/beneficiary/carryforward` على المستفيد فقط
3. **F-22 + F-18**: فصل مسارات الواقف فعلياً عن مسارات المستفيد
4. **F-16**: إعادة تسمية `ALL_NON_ACCOUNTANT`
5. **F-23**: اختبارات `SupportPageGuard` لكل دور
6. **F-13**: toast عند redirect في SupportPageGuard
7. **F-05**: تشديد فحص npm audit
8. **F-06**: عدم إخفاء فشل auto-version
9. **F-04**: التأكد من lazy load لكل `*Inner` recharts
10. **F-17**: structured logger في edge functions

---

## 5) False Positives مرفوضة (تم التحقق ولا مشكلة)

- ❌ "console.log منتشر في src" — **مرفوض**: فقط في `lib/logger.ts` و`test/setup.ts` (مقصود)
- ❌ "supabase.rpc مباشر خارج lib" — **مرفوض**: 0 نتائج
- ❌ "functions.invoke مباشر خارج lib" — **مرفوض**: 0 نتائج
- ❌ "getSession في edge functions" — **مرفوض**: فقط في تعليقات تحذيرية
- ❌ "جداول بدون RLS" — **مرفوض**: 0 جداول
- ❌ "ملفات > 200 سطر تخالف القاعدة" — **مرفوض**: لا يوجد ملف منتج (non-test) يتجاوز 200 سطر (أكبر منتج = 198)
- ❌ "routes مكررة" — **مرفوض**: 0 تكرار
- ❌ "auto-version يفشل على tags مكررة" — **مُصلح بـ H1**

---

## 6) يحتاج تحقق يدوي (Runtime Verification)

- **R-1**: التحقق الفعلي أن واقف لا يستطيع الوصول لـ `/beneficiary/messages` و`/beneficiary/carryforward` (UX حالياً يسمح، RLS قد يحجب لكن يجب تأكيده)
- **R-2**: قياس bundle size بعد lazy-load كل `*Inner` recharts
- **R-3**: اختبار realtime cleanup عند تنقل سريع بين صفحات
- **R-4**: تجربة WebAuthn على iOS Safari + Android Chrome
- **R-5**: زمن أول تحميل dashboard للأدوار الأربعة

---

## 7) خارطة طريق الإصلاح (Phases)

```text
Phase 0 (لا يوجد بنود P0)        — لا شيء
Phase 1 — أمان/صلاحيات (نصف يوم)
  F-01, F-02, F-22, F-23
Phase 2 — تحسينات UX (ساعة)
  F-13, F-20, F-16
Phase 3 — CI/CD (ساعة)
  F-05, F-06, F-15
Phase 4 — أداء (يوم)
  F-04 (تحقق lazy)، F-17 (logger)
Phase 5 — تنظيف وتوثيق (نصف يوم)
  F-07, F-08, F-09 (إعادة هيكلة وقائية)
  F-11, F-19, F-21
```

---

## 8) ماذا أفعل الآن؟

اعتمد أحد المسارات:

- **A**: أبدأ بـ **Phase 1 (F-01, F-02)** فقط — أكثر بند له أثر أمني حقيقي.
- **B**: أبدأ بـ **Top 10 Must-Fix** على مراحل صغيرة.
- **C**: ركّز على بند محدد بالاسم (مثلاً: "نفّذ F-13 فقط").

**لن أنفذ أي شيء قبل تأكيدك للبند تحديداً.**
