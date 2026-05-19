
# خطة Refactor Sprint — تنظيف معماري شامل

**المدة المتوقعة:** 5–7 جلسات عمل متتالية
**المبدأ:** كل خطوة قابلة للنشر مستقلة. نتحقق بعد كل مرحلة عبر `bun run typecheck` و`lint:conventions`.
**مستثنى:** البند #1 من التقرير (`.env`) لأنه لا ينطبق على Lovable Cloud.

---

## المرحلة 1 — توثيق وتوحيد المصطلحات (آمن، صفر مخاطر)

**الهدف:** إزالة تعارض الوثائق مع الواقع.

- تحديث `src/hooks/README.md`: استبدال كل ذكر لـ `financial/` بـ `domain/`، وتحديث رسم اتجاه التبعيات
- إنشاء `ARCHITECTURE.md` في جذر المشروع — صفحة واحدة موحّدة تشرح الطبقات النهائية وتُحيل لـ READMEات الفرعية
- تحديث `src/hooks/domain/README.md` ليعكس وجود `useDistributionCalculation`

**التحقق:** قراءة بصرية + `lint:conventions`.

---

## المرحلة 2 — توسيع check-conventions.mjs (حواجز إضافية)

تضاف القواعد التالية:
- منع `supabase.from(` و`supabase.auth.` و`supabase.functions.invoke(` داخل `src/pages/` و`src/components/`
- منع `supabase.from(` داخل `src/lib/` خارج `src/lib/services/` و`src/lib/auth/` (الاستثناءان المسموحان)
- منع استيراد أي ملف من `hooks/page/` داخل `hooks/data/` أو `hooks/domain/`
- تحذير (لا فشل) إذا تجاوز ملف في `hooks/page/` 200 سطر

**التحقق:** تشغيل الحارس ورصد المخالفات الحالية كقائمة عمل للمراحل التالية.

---

## المرحلة 3 — توحيد طبقة البيانات (High)

### 3.1 إنشاء `lib/services/searchService.ts`
- نقل استعلامات Supabase من `src/lib/search/globalSearchFn.ts` إلى service جديد بدوال صغيرة: `searchContracts`, `searchProperties`, `searchInvoices`, `searchBeneficiaries`
- `globalSearchFn.ts` يصبح **مُجمِّعاً** (composer) يستدعي الـ service ويُشكّل النتيجة الموحّدة فقط — بدون SQL مباشر

### 3.2 تنظيف `lib/auth/nationalIdLogin.ts`
- استخراج rate-limit إلى `lib/services/rateLimitService.ts` (موجود ضمنياً — يُستخلص)
- إبقاء `setSession` و`signIn` في `lib/auth/` فقط (هذا boundary مقصود لـ auth)
- نقل أي `notify` خارج هذه الطبقة

### 3.3 فحص بقايا
- `rg "supabase\.(from|rpc|auth|functions|storage)" src/lib src/hooks/page src/components` ومراجعة كل تطابق
- ما يكون منطقياً ينقل إلى الـ service المناسب أو يُسوَّغ في تعليق

**التحقق:** typecheck + اختبارات + الحارس الجديد.

---

## المرحلة 4 — تفكيك page hooks الكبيرة (High)

### 4.1 `useContractsPage.ts`
يُقسّم إلى:
- `useContractsFilters.ts` — state للبحث والفلاتر
- `useContractsActions.ts` — handlers (create/edit/delete/renew)
- `useContractsExport.ts` — منطق التصدير
- `useContractsPage.ts` — مُجمّع رفيع يستدعي الثلاثة

### 4.2 `useBeneficiaryDashboardPage.ts`
- `useBeneficiaryGreeting.ts` (domain layer — منطق التحية + الوقت)
- `useBeneficiaryDashboardRealtime.ts` — اشتراكات realtime + invalidation
- `useBeneficiaryDashboardPage.ts` — تجميع + view model

### 4.3 `useSupportDashboardPage.ts`
- نقل `exportToCsv` إلى `src/utils/export/toCsv.ts` (نقي تماماً)
- استخراج فلاتر التذاكر إلى `useSupportTicketFilters.ts`

### 4.4 `useAuditLogPage.ts`
- استخراج معاينة السجل وtemplate التصدير

**التحقق:** اختبارات الصفحات الحالية يجب أن تمر دون تعديل (الواجهة العامة للـ page hooks لا تتغير).

---

## المرحلة 5 — إعادة تموضع ملفات (Medium)

| من | إلى | السبب |
|----|----|--------|
| `hooks/ui/useLayoutState.ts` | `hooks/page/shared/useLayoutShell.ts` | يستدعي auth/fiscal/messages — ليس UI نقي |
| `hooks/page/beneficiary/dashboard/useWaqifDashboardPage.ts` | `hooks/page/waqif/useWaqifDashboardPage.ts` | المسار يخالف الدور |
| `src/lib/search/globalSearchFn.ts` (بعد 3.1) | يبقى مكانه كـ composer | — |

تُحدَّث جميع الاستيرادات مع كل نقل.

---

## المرحلة 6 — توحيد تسمية الإشعارات (Medium)

| الاسم الحالي | الاسم الجديد | المجال |
|-------------|--------------|--------|
| `defaultNotify` | `uiNotify` | toast من sonner |
| `notifyUser` (في `notificationService`) | `enqueueUserNotification` | DB record |
| `notifyAdminsSilent` | `broadcastAdminNotification` | DB record |
| `notify` (الوثائق) | `uiNotify` | تحديث الإشارات |

تنفّذ كـ rename موحّد عبر codemod بسيط (`rg` + `sed`).

---

## المرحلة 7 — تنظيف barrels وبقايا التوافق (Medium/Low)

- تدقيق كل `index.ts` في `components/` و`hooks/` للتأكد من عدم وجود re-export متبادل
- حذف أي re-export wrapper لم يعد له مستهلكون (`rg` للتحقق قبل الحذف)
- إضافة قاعدة في `check-conventions.mjs`: barrel لا يحتوي أكثر من 20 export

---

## المرحلة 8 — تجميع auth modules (Medium)

إنشاء بنية فرعية موثّقة (بدون نقل قسري) داخل `src/hooks/auth/`:

```
hooks/auth/
├── session/      — useAuthListener, useSessionExpiry, useAuthCleanup
├── role/         — useRoleRedirect, useFetchUserRole
├── biometric/    — useWebAuthnAuth/Register/Manage
└── flows/        — useLoginFlow, useLogoutFlow
```

يُنقل كل ملف لمكانه الصحيح + يُحدَّث استيراده.

---

## ما لن يُنفّذ في هذا الـ Sprint

- نقل `logger`, `cn`, `notify` إلى مجلدات فرعية — تم رفضه سابقاً (يلامس مئات الملفات بلا قيمة معمارية حقيقية)
- إعادة تسمية `hooks/domain` ↔ `hooks/financial` — `domain` هو الاسم الصحيح؛ نُحدِّث الوثائق فقط
- أي تغيير في schema الـ DB أو RLS

---

## تقدير المخاطر

| المرحلة | المخاطر | التخفيف |
|---------|---------|---------|
| 1, 2 | لا شيء (وثائق + سكربت) | — |
| 3.1 | كسر البحث الموحّد | اختبار يدوي بعد النقل |
| 3.2 | كسر تسجيل دخول الهوية | حذر شديد، اختبار end-to-end |
| 4 | تغيير سلوك page hook | الاختبارات الحالية تُمسك أي رجوع |
| 5 | كسر استيرادات | typecheck يمسك الكل |
| 6 | rename واسع | codemod + typecheck |
| 7 | حذف export مستخدم | `rg` قبل كل حذف |
| 8 | كسر مسار مصادقة | اختبار يدوي بعد كل نقل |

---

## التسليم

بعد كل مرحلة:
- `bun run typecheck` ✓
- `bun run lint:conventions` ✓
- `bun run test` ✓
- ملاحظة في task tracker

عند الانتهاء الكلّي: تحديث ذاكرة المشروع بقاعدة جديدة (`mem://technical/architecture/sprint-2026-05-cleanup`) توثّق ما تغيّر.
