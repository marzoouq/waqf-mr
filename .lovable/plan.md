## التحقق الصارم بند بند — التقرير الجديد

فحص مباشر من المصدر الحقيقي (لا اعتماد على ادعاء)، بعد إصلاحات الجلسات السابقة.

### القسم 1 — Misplaced files / responsibilities

| البند | الادعاء | الحقيقة | الحكم |
|---|---|---|---|
| **A** | AuthContext يستورد supabase ويستعمله مباشرة | ✅ صحيح **هيكلياً**: السطر 28 يستعمل `supabase.auth.signInWithPassword`، السطر 59 `supabase.auth.signOut`. **لكن** قاعدة ARCHITECTURE.md تقول "supabase **للجداول**" (CRUD/select/realtime) — استدعاءات `supabase.auth.*` ليست table access. التقرير يخلط بين الاثنين | ⚠️ **مبالَغ فيه** |
| **B** | `lib/auth/fetchUserRole.ts` يقرأ `user_roles` خارج hooks/data | ✅ صحيح، يفعل `supabase.from('user_roles').select(...)`. **لكن** ARCHITECTURE.md السطر 56 يصرّح: "`lib/auth/*` — منطق مصادقة منخفض المستوى — **boundary مقصود**". الاستثناء **موثّق فعلاً** | ⚠️ **ادعاء قديم** |
| **C** | `src/lib/hooks/` يبدو معماريّاً مريباً | ✅ موجود (3 ملفات: useNowClock, useStableRef, README). تمت معالجته في الجلسة السابقة بـREADME يحدّد البوندري | ⚠️ **معالَج جزئياً** |
| **D** | `diagnosticsService` يكشف "مشكلة boundary" | ✅ موجود، لكن التعليق الفعلي يقول "تُستخدم من `lib/diagnostics/checks/` بدلاً من Supabase مباشرة" — هذا **نمط صحيح** (طبقة تجريد بين utils النقية وSupabase). تأطير التقرير سلبي بلا مبرر | ❌ **تأويل خاطئ** |

### القسم 2 — هوكات مختلطة المسؤوليات (الأهم)

| البند | الادعاء | الحقيقة | الحكم |
|---|---|---|---|
| **useWebAuthnManage** | يجمع storage + supabase + uiNotify + state | ✅ **صحيح فعلاً**. 115 سطر، يستورد supabase + safeGet + uiNotify + 5+ استدعاءات supabase.auth/from | ✅ **صحيح** |
| **useNotificationActions** | يحتوي AudioContext + Notification API + safeGet | ✅ **صحيح فعلاً**. 81 سطر، `new AudioContext()` السطر 20، `new window.Notification(...)` السطر 69، safeGet السطر 21 و63 | ✅ **صحيح** |
| **Data hooks مع uiNotify** | useUnits, useTenantPayments, useAppSettingsWrite, useZatcaInvoiceActions | جزئياً صحيح: **10 ملفات** فعلاً في `hooks/data/` تستخدم uiNotify. `useTenantPayments` **لم يعد** كذلك (أُصلح في الجلسة السابقة) | ✅ **صحيح** (إلا useTenantPayments) |

### القسم 3 — Naming / Taxonomy

| البند | الحقيقة | الحكم |
|---|---|---|
| **hooks/page vs hooks/application** | كلاهما موجود فعلاً. `hooks/application/` **طبقة مقصودة وموثقة** في `mem://technical/architecture/hooks-application-layer` (feature controllers عابرة الأدوار). لكن `src/hooks/README.md` لا يذكرها — **README ناقص**، لا "drift" معماري | ⚠️ **README ناقص فقط** |

### القسم 4 — Backend / Edge

| البند | الحقيقة | الحكم |
|---|---|---|
| **webauthn helpers يستخدم domain قديم** | ✅ **صحيح وخطير**: `supabase/functions/webauthn/helpers.ts:25` يستخدم `https://waqf-mr.lovable.app` كfallback. النطاقات الحالية في `_shared/cors.ts` هي `waqf-wise.net` فقط. هذا fallback خاطئ ومنفصل عن مصدر الحقيقة | ✅ **صحيح ومهم** |
| **تكرار في ZATCA** | onboard 182 سطر، renew 147، signer 257. `_shared/zatca-shared.ts` موجود فعلاً. التكرار محتمل لكن غير حرج | ⚠️ **مقبول** |
| **lib/realtime/channelFactory.ts يستخدم supabase خارج boundaries الموثقة** | ✅ صحيح. ARCHITECTURE.md يذكر `lib/auth/*` كاستثناء فقط، لا `lib/realtime/*` | ✅ **صحيح، يحتاج توثيق** |

### خلاصة الفحص الصارم
- ✅ **6 بنود صحيحة فعلاً**: useWebAuthnManage مختلط، useNotificationActions مختلط، data hooks مع uiNotify، webauthn helpers fallback خاطئ، lib/realtime استثناء غير موثق، توثيق hooks README ناقص
- ⚠️ **4 بنود مبالغ فيها أو قديمة**: AuthContext auth.* (ليس CRUD)، fetchUserRole (موثّق فعلاً)، src/lib/hooks (معالَج)، application/page (طبقة مقصودة)
- ❌ **1 تأويل خاطئ**: diagnosticsService

---

## خطة الإصلاح — 5 مراحل (نطاق محدود، صفر مساس بالمصادقة)

### المرحلة 1 — إصلاح webauthn helpers fallback (أمن/تشغيل)
- `supabase/functions/webauthn/helpers.ts:25`: استبدال fallback إلى `https://waqf-wise.net` بدلاً من `waqf-mr.lovable.app` القديم
- إضافة guard: إذا `origin` غير موجود في `ALLOWED_ORIGINS` من `_shared/cors.ts` → استخدم أول origin مسموح
- **لا يلامس** منطق WebAuthn نفسه ولا التحقق

### المرحلة 2 — تحديث `src/hooks/README.md`
- إضافة سطر يذكر `hooks/application/` كطبقة feature controllers عابرة الأدوار (مع رابط للذاكرة)
- توضيح أن `application/` ≠ `page/`: page = صفحة واحدة، application = منطق ميزة عابر صفحات/أدوار

### المرحلة 3 — توثيق boundaries المسموحة في ARCHITECTURE.md
- إضافة `lib/realtime/*` للاستثناءات الموثقة (السطر 56)
- إضافة `lib/services/diagnosticsService.ts` كاستثناء صريح (طبقة تجريد للtest/utils)
- إضافة جملة: "`supabase.auth.*` (غير `from/rpc`) مسموح في contexts/AuthContext كجزء من boundary المصادقة"

### المرحلة 4 — تفكيك `useNotificationActions` (الأقل خطورة)
- استخراج audio + Notification إلى hook UI جديد: `src/hooks/ui/useNotificationSounds.ts`
- إبقاء mutations + realtime invalidation في `useNotificationActions`
- المستهلك الوحيد `useNotifications` يستدعي كلاهما — لا تغيير في API الخارجي

### المرحلة 5 — تفكيك `useWebAuthnManage` (الأكثر حساسية)
**اقتراح فقط، يتطلّب موافقة منفصلة لأنه يلمس مسار البصمة:**
- استخراج قراءات supabase إلى `hooks/data/auth/useWebAuthnCredentials.ts`
- إبقاء UI state + uiNotify في `useWebAuthnManage`
- **لن أنفّذها افتراضياً** — هذا hook حسّاس أمنياً، أنتظر إذناً صريحاً

---

## ما لن نلمسه
- ❌ AuthContext — استدعاءات `supabase.auth.*` ليست انتهاكاً
- ❌ `lib/auth/fetchUserRole` — موثّق فعلاً كاستثناء
- ❌ `lib/services/diagnosticsService` — نمط صحيح
- ❌ ZATCA functions — التكرار مقبول والـ_shared موجود
- ❌ بقية data hooks مع uiNotify (9 ملفات) — نمط مقبول في React Query، تغييرها سلسلة طويلة تلامس كل المستهلكين
- ❌ AuthContext, ProtectedRoute, client.ts, types.ts, config.toml

---

## ترتيب التنفيذ المقترح
1️⃣ **المرحلة 1** — webauthn fallback (إصلاح سريع، يمنع bug محتمل)
2️⃣ **المرحلة 2** — توثيق hooks/application في README
3️⃣ **المرحلة 3** — توثيق lib/realtime + auth.* exceptions
4️⃣ **المرحلة 4** — تفكيك useNotificationActions
5️⃣ **المرحلة 5** — useWebAuthnManage (انتظار إذن صريح)

**سؤال**: نفّذ 1-4 مباشرة وأتوقف عند 5، أم تريد ترتيباً مختلفاً؟
