# خطة شاملة — إصلاح فجوات المعمارية والأمن (مُتحقَّق منها فعليًا في الكود)

تستند هذه الخطة إلى نتائج الفحص الجنائي الذي أكدته بـ `rg` و`git ls-files` على المستودع الفعلي. الترتيب من **الأعلى خطورة** إلى **التحسينات الاختيارية**.

---

## P0 — أمن وCI (فوري، يحجب أي push)

### 1. إزالة `.env` من تتبع Git
- `git rm --cached .env` ثم تأكيد بقاء الملف محلياً.
- التحقق أن `.gitignore` يحتوي `.env` (مع إبقاء `.env.example`).
- تدوير `VITE_SUPABASE_PUBLISHABLE_KEY` ليس ضرورياً (anon key علني)، لكن نوثّق ذلك في `docs/security/`.

### 2. تشديد Gitleaks
- في `.github/workflows/ci.yml`: إزالة `continue-on-error: true` من خطوة Gitleaks لتصبح حاجبة.
- إبقاء allowlist للملفات الموثقة (مفاتيح anon المعروفة).

### 3. تشديد بوابات Audit
في `scripts/audit-conventions-deep.mjs` إضافة قواعد Critical جديدة:
- منع `from 'sonner'` و `await import('sonner')` داخل `src/hooks/data/**`.
- منع `from '@/integrations/supabase/client'` داخل `src/hooks/page/**` (مع whitelist مؤقت للملفين الجاري نقلهما).
- منع `from 'sonner'` و `from '@/integrations/supabase/client'` داخل `src/utils/**` (موجودة جزئياً — توسيع التغطية).

---

## P1 — إصلاح انتهاكات الطبقات المُتحقَّق منها

### 4. إزالة toast من `hooks/data`
ملف واحد فقط ثبت فيه الانتهاك:
- `src/hooks/data/beneficiaries/useBeneficiaries.ts` — يستدعي `await import('sonner')` في mutations.
- نقل الإشعارات إلى wrapper في `src/hooks/page/admin/beneficiaries/` (أو الـ page hook المستهلك)، وإبقاء data hook نقياً يعيد `{ data, error }`.

### 5. استخراج Supabase من `hooks/page/admin/settings`
الملفان المثبتان:
- `useLogoUpload.ts` (سطور 52, 57: `supabase.storage` + `supabase.from('app_settings')`).
- `useWaqfInfoSave.ts` (سطور 33, 37, 48, 55: نفس النمط).

الخطوات:
- إنشاء `src/lib/services/settingsAssetsService.ts` يحتوي:
  - `uploadWaqfAsset(file, path)` → `{ publicUrl }`
  - `upsertAppSetting(key, value)`
  - `removeAppSetting(key)`
- استبدال الاستدعاءات داخل الـ page hooks بالخدمة (يبقى UI state + uiNotify في الـ hook).

### 6. نقل `useNotificationVisibilityPrefs`
- من `hooks/data/notifications/` إلى `hooks/ui/` (يستخدم localStorage/window فقط — ليس بيانات).

---

## P2 — تنظيف `utils/` (browser side effects)

### 7. تحديث تعريف `utils/` (المسار الأخفّ كسراً)
- توضيح في `src/utils/README.md` أن DOM/Canvas/Blob/URL مسموحة (لأنها deterministic transforms) ما دامت لا تستورد Supabase/sonner.
- **بديل أكثر صرامة (مؤجَّل P3)**: نقل `utils/image/`, `utils/pdf/`, `utils/fonts/loadAmiriFonts.ts` إلى `lib/browser/` — يكسر ~14 import path.

---

## P3 — Bug فعلي في قياس الأداء

### 8. تصحيح دلالات `pageMonitor`
- في `src/lib/performance/pageMonitor.ts` (أو ما يقابله) فصل ثلاثة مفاهيم:
  - `route_change` — وقت التنقل (Navigation Timing).
  - `data_ready` — أول لحظة جاهزية بيانات أساسية (إشارة من الـ page hook).
  - `route_dwell` — مدة بقاء المستخدم (تُسجَّل عند unmount، لا تُخلط مع load).
- تحديث `usePagePerformance` ليُصدر الإشارة الصحيحة.
- إصلاح p50/p95 ليُحسب على `data_ready` فقط.

### 9. `lazyWithRetry` يستخدم `safeSession*`
- استبدال `sessionStorage.getItem/setItem` المباشر في `src/lib/lazyWithRetry.ts` (أو ما يقابله) بـ `safeSessionGetItem/safeSessionSetItem` من `src/lib/storage.ts`.

---

## P4 — تحسينات اختيارية

### 10. تقسيم `main.tsx` إلى `src/app/bootstrap/`
- `theme.ts`, `monitoring.ts`, `pwa.ts`, `queryClient.ts` كل واحد يصدّر `init*()`.
- `main.tsx` يصبح ~15 سطر.

### 11. توثيق الفروقات في `audit/architecture-map.md`
- تحديث الخريطة لتعكس انقسامات P1.2/P1.3/P1.4.

---

## تفاصيل تقنية للمراجعة

**الملفات التي ستُعدَّل (مرتّبة حسب الأولوية):**

```text
P0:
  .gitignore                                              (تأكيد .env)
  .github/workflows/ci.yml                                (gitleaks blocking)
  scripts/audit-conventions-deep.mjs                      (3 قواعد جديدة)

P1:
  src/hooks/data/beneficiaries/useBeneficiaries.ts        (حذف toast)
  src/hooks/page/admin/beneficiaries/<wrapper>.ts         (إضافة toast)
  src/lib/services/settingsAssetsService.ts               (جديد)
  src/hooks/page/admin/settings/useLogoUpload.ts          (استخدام الخدمة)
  src/hooks/page/admin/settings/useWaqfInfoSave.ts        (استخدام الخدمة)
  src/hooks/ui/useNotificationVisibilityPrefs.ts          (نقل)

P2:
  src/utils/README.md                                     (توضيح browser utils)

P3:
  src/lib/performance/pageMonitor.ts                      (فصل MetricKind)
  src/hooks/ui/usePagePerformance.ts                      (إصلاح القياس)
  src/lib/lazyWithRetry.ts                                (safeSession*)

P4:
  src/app/bootstrap/{theme,monitoring,pwa,queryClient}.ts (جديد)
  src/main.tsx                                            (تبسيط)
  audit/architecture-map.md                               (تحديث)
```

**أوامر `git` المطلوبة (P0 فقط):**
```bash
git rm --cached .env
```
لا يوجد مسح تاريخ (history rewrite) لأن المفتاح anon علني بطبيعته.

**خطة التحقق بعد التنفيذ:**
1. `bun run lint && bun test`
2. `node scripts/audit-all.mjs` — يجب أن يبقى Critical=0 وGAP=0 مع القواعد الجديدة.
3. فحص يدوي لصفحات: رفع الشعار، حفظ بيانات الوقف، إنشاء/تحديث مستفيد، التنقل بين الصفحات (للأداء).

**ما هو خارج النطاق صراحةً:**
- إعادة تنظيم `components/` حسب features/roles (لا دليل على ألم فعلي).
- AST-based audit (الـ regex gates كافية حالياً).
- تقسيم `vite.config.ts` و`eslint.config.js`.
- نقل ملفات `utils/image|pdf|fonts` إلى `lib/browser/` (مؤجَّل لـ P3 مستقبلية).

---

## ترتيب التنفيذ المقترح في جلسات

- **جلسة 1 (P0)**: 3 ملفات، حاجب CI.
- **جلسة 2 (P1)**: 6 ملفات، إصلاح طبقات.
- **جلسة 3 (P2+P3)**: README + 3 ملفات أداء.
- **جلسة 4 (P4 اختياري)**: bootstrap modularization.

هل أبدأ بـ **جلسة 1 (P0)** فور الموافقة، أم تريد تعديل النطاق أولاً؟
