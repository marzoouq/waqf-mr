## التحقق الصارم من تقرير المراجعة

تم فحص كل بند مباشرةً في الشيفرة الحالية بعد تحسينات الجلسة السابقة. النتائج بشفافية كاملة:

| # | البند | حكم التحقق | الدليل |
|---|---|---|---|
| **H1** | utils/diagnostics ينتهك قاعدة "نقاء utils" | ❌ **متجاوَز** | تم نقله إلى `src/lib/diagnostics/` في المرحلة 1 — لا وجود لـ `src/utils/diagnostics` |
| **H2** | `lib/services/` يحوي CRUD بسيط مخالف للوثيقة | ✅ **صحيح** | `appSettingsService.ts` (49 سطر CRUD على `app_settings`) و `unitsService.ts` (27 سطر CRUD على `units`) |
| **H3** | Auth.tsx ليس logic-less | ⚠️ **مختلط** | الصفحة 132 سطر، تستدعي `useAuthPage` من `hooks/application/`. لكن `hooks/application/` **طبقة موثقة فعلياً** (راجع mem://technical/architecture/hooks-application-layer). الادعاء بأنها "غير موثقة" قديم. يبقى أن الصفحة فيها كتلة شرطية لانتظار الدور |
| **M1** | useNotifications يخلط مسؤوليات | ✅ **صحيح** | 119 سطر — يجمع supabase + localStorage + window events + role filtering + prefs |
| **M2** | data hooks تستدعي uiNotify | ✅ **صحيح** | `useTenantPayments.ts` يستدعي `uiNotify.success/.error` مباشرة (سطور 65/69) |
| **M3** | FiscalYearContext يطلق prefetch عالمياً | ⚠️ **مخفف** | صحيح هيكلياً، **لكن** `useDashboardPrefetch` يحرس داخلياً بـ `if (!isAdminOrAccountant ...) return;` فلا عمل فعلي على المسارات العامة. التحسين تجميلي |
| **M4** | RootLayout يجمّع 6 اهتمامات | ⚠️ **بسيط** | 63 سطر فقط، مقبول حالياً لكن قد يكبر |
| **D1** | README يذكر `components/waqf/` بينما الموجود `waqf-info/` و `waqif/` | ✅ **صحيح** | لا يوجد مجلد `waqf` |
| **D2** | README يقول 11 Edge Function، الواقع 18 | ✅ **صحيح** | عدّت 18 دالة فعلية |
| **D3** | تعارض بين services README و ARCHITECTURE.md | ✅ **صحيح** | services/README يصرّح بالاستخدام من `hooks/page`، الوثيقة تمنع CRUD-services |
| **S1** | `.env` مرفوع للمستودع | ⚠️ **متروك بأمان** | الملف **مُتعقّب فعلاً** في git لكنه يحوي فقط مفاتيح Supabase **العامة** (anon + URL). `.gitignore` يستثني `.env.*` للملفات الجديدة. لا أسرار حقيقية مكشوفة، لكن الممارسة سيئة |

**خلاصة الفحص**: 7 بنود صحيحة، 3 مخففة/جزئية، 1 متجاوَز سابقاً، 1 ادعاء قديم عن `hooks/application`.

---

## خطة المعالجة — 4 مراحل

### المرحلة 1 — تصحيح انجراف الوثائق (مخاطر = صفر)
- تحديث README: عدد Edge Functions من 11 → 18 + قائمة محدّثة
- تصحيح `components/waqf` → `components/waqf-info`
- توحيد قاعدة الطبقات بين `ARCHITECTURE.md` و `src/lib/services/README.md`:
  - **القرار المقترح**: services مسموح أن تكون repositories لكل جدول (الواقع الحالي)، نحدّث `ARCHITECTURE.md` ليطابق الممارسة بدلاً من العكس (لأن إعادة دمج الـservices في hooks/data أكبر بكثير).

### المرحلة 2 — تفكيك `useNotifications` (M1)
نقسّمه إلى:
- `useNotificationPreferences` — قراءة localStorage + storage events
- `useNotificationsQuery` — استعلام Supabase فقط
- `useVisibleNotifications` — فلترة حسب الدور والتفضيلات
- يبقى `useNotifications` orchestrator نحيف يجمعها (للتوافق مع المستهلكين)

### المرحلة 3 — تنظيف uiNotify من طبقة data (M2)
- نقل toast من `useTenantPayments` إلى الـpage hook المستهلك
- لا نلمس باقي data hooks في هذه الجولة (نطاق محدود، لا يمس مكونات أخرى)

### المرحلة 4 — أمان `.env` (S1)
- إزالة `.env` من تعقّب git مع الإبقاء على الملف محلياً (`git rm --cached`)
- تأكيد `.gitignore` يغطيه (يغطّيه بالفعل)
- **بدون تدوير مفاتيح** لأنها مفاتيح anon عامة بحكم تصميمها

---

## ما لن نلمسه (التزاماً بـ "دون المساس بالمكونات الأخرى")
- ❌ Auth.tsx / useAuthPage — `hooks/application` طبقة موثقة، الادعاء غير دقيق
- ❌ FiscalYearContext prefetch — الحارس الداخلي يكفي
- ❌ RootLayout — حجمه مقبول
- ❌ نقل CRUD services إلى hooks/data — تغيير جذري يلامس كل المستهلكين
- ❌ AuthContext, ProtectedRoute, client.ts, types.ts, config.toml

---

## أولوية التنفيذ المقترحة
1️⃣ المرحلة 1 (وثائق) — لا مخاطر، قيمة عالية
2️⃣ المرحلة 4 (.env) — سريع وآمن
3️⃣ المرحلة 2 (useNotifications) — تحسين بنيوي مهم
4️⃣ المرحلة 3 (uiNotify في useTenantPayments) — صغير ومنعزل

**تأكيد قبل البدء**: نفّذ كل المراحل متتالية، أم مرحلة-مرحلة بمراجعة بعد كل واحدة؟
