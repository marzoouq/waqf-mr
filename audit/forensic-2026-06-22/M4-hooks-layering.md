# M4 — Forensic: Hooks Layering Violations
**تاريخ الفحص:** 2026-06-22  
**الفاحص:** Explore (sub-agent)  
**النطاق:** `src/hooks`, `src/pages`, `src/components`, `src/utils`  
**المرجع:** `audit/architecture-map.md`

---

## ملخص تنفيذي

| القاعدة | الوصف | عدد الانتهاكات | الخطورة |
|---|---|---|---|
| R1 | `pages/**` أو `components/**` → `@/integrations/supabase/client` | **0** | Critical |
| R2 | `console.log/warn/error` في كود الإنتاج | **0** | Medium |
| R3 | `sonner` أو `@/lib/notify` داخل `hooks/data/**` | **2** | High |
| R3b | `hooks/data/**` → `hooks/ui/**` (cross-layer) | **1** | High |
| R4 | `@/hooks/data` داخل `utils/**` | **0** | High |
| R5 | Barrel → Barrel داخل `src/hooks` | **0** | Warning |
| R6 | صفحات تستخدم Supabase مباشرةً بدل page hook | **0** | Critical |

**مجموع الانتهاكات الفعلية: 3**  
**حالة إجمالية: 🟡 تحذيرات — لا انتهاكات حرجة، لكن طبقة data تتسرب نحو UI**

---

## R1 — pages / components → supabase مباشرةً
**النتيجة: ✅ صفر انتهاكات**

```
rg -n "from '@/integrations/supabase/client'" src/pages src/components
→ (no output)
```

جميع الصفحات تستهلك Supabase عبر `hooks/data/**` فقط كما تفرض المعمارية.

---

## R2 — console.log/warn/error في الإنتاج
**النتيجة: ✅ صفر انتهاكات**

الاستدعاءات الموجودة محاطة كلّها بالسياقات المشروعة:

| الملف | السبب |
|---|---|
| `src/lib/logger.ts:17,20,22,38` | تعريف logger نفسه — مشروع |
| `src/test/setup.ts:19-23` | إعداد اختبارات — مشروع |
| `src/routes/RouteErrorBoundary.test.tsx:17-22` | ملف اختبار — مشروع |

لا يوجد أي `console.*` خامّ في ملفات الإنتاج خارج `src/lib/logger.ts`.

---

## R3 — Toast / @lib/notify داخل hooks/data
**النتيجة: ⚠️ 2 انتهاك (High)**

المعمارية تحظر: `hooks/data/**` → `sonner` أو `@/lib/notify`  
(الإشعارات مسؤولية طبقة page/application — ليس data)

### الانتهاك 1
**`src/hooks/data/notifications/useNotificationActions.ts:11`**
```ts
import { uiNotify } from '@/lib/notify';
```
الاستخدام في السطور: `88`, `104`, `120`, `136`
```ts
uiNotify.error('تعذّر تحديث حالة الإشعار');
uiNotify.error('تعذّر تحديث حالة الإشعارات');
uiNotify.error('تعذّر حذف الإشعارات المقروءة');
uiNotify.error('تعذّر حذف الإشعار');
```
> 📝 التبرير الموجود في الكود: "يمنع سيناريو ضغطت قراءة الكل ثم أُغلق التطبيق"  
> ❌ غير مقبول معمارياً — المستهلِك يجب أن يتولى الإشعار.

### الانتهاك 2
**`src/hooks/data/settings/app/useAppSettingsWrite.ts:9`**
```ts
import { uiNotify } from '@/lib/notify';
```
الاستخدام في السطور: `60`, `62`
```ts
uiNotify.success(SAVE_MESSAGES.saveSuccess);
uiNotify.error(SAVE_MESSAGES.saveError);
```
> 📝 التبرير الموجود في الكود: "`updateJsonSetting` facade يُستخدم من 15+ صفحة"  
> ❌ حجة الراحة لا تُبرر انتهاك طبقة البيانات.

---

## R3b — hooks/data → hooks/ui (cross-layer import)
**النتيجة: ⚠️ 1 انتهاك (High)**

**`src/hooks/data/notifications/useNotificationActions.ts:14`**
```ts
import { useNotificationSounds } from '@/hooks/ui/useNotificationSounds';
```
طبقة `data` تستورد من طبقة `ui` — عكس اتجاه الاعتماد المسموح:  
`hooks/page → hooks/data` ✅  
`hooks/data → hooks/ui` ❌

---

## R4 — @/hooks/data داخل utils
**النتيجة: ✅ صفر انتهاكات**

```
rg -n "from '@/hooks/data'" src/utils
→ (no output)
```

---

## R5 — Barrel → Barrel داخل src/hooks
**النتيجة: ✅ صفر انتهاكات**

الـ barrel files المكتشفة:

| الملف | النمط |
|---|---|
| `src/hooks/data/contracts/index.ts` | يُصدّر من ملفات مباشرة فقط ✅ |
| `src/hooks/data/core/index.ts` | يُصدّر من ملفات مباشرة فقط ✅ |
| `src/hooks/data/settings/index.ts` | يُصدّر من ملفات مباشرة فقط ✅ |
| `src/hooks/page/beneficiary/index.ts` | يُصدّر من ملفات مباشرة — التعليق يُصرّح صراحةً بتجنب barrel→barrel ✅ |

لم يُكتشف أي `index.ts` يستورد من `index.ts` آخر.

---

## R6 — صفحات تستخدم Supabase مباشرةً بدل page hook
**النتيجة: ✅ صفر انتهاكات**

```
rg -n "from '@/integrations/supabase/client'" src/pages
→ (no output)
```

ملاحظة: `src/hooks/page/admin/financial/useVoucherActions.ts:1`  
```ts
import type { Database } from '@/integrations/supabase/types';
```
هذا import **نوع** (`import type`) وليس استخدام client — مقبول.

---

## إحصاء إجمالي

| الطبقة | Supabase مباشر | console.* | sonner/notify | cross-layer |
|---|---|---|---|---|
| `src/pages` | 0 | 0 | 0 | 0 |
| `src/components` | 0 | 0 | 0 | 0 |
| `src/hooks/data` | 49 ✅ (مسموح) | 0 | **2 ❌** | **1 ❌** |
| `src/hooks/page` | 0 | 0 | 0 | 0 |
| `src/utils` | 0 | 0 | 0 | 0 |

---

## التوصيات

### P1 — رفع hooks/ui إلى hooks/page (عاجل)
**`useNotificationActions.ts`** — نقل `useNotificationSounds` إلى المستهلِك في `hooks/page` وتمريره كـ callback أو prop.

### P2 — إزالة notify من hooks/data (عاجل)
- `useNotificationActions.ts` → حذف `uiNotify` وإعادة الخطأ كـ `throw` ليتولى المستهلِك العرض.
- `useAppSettingsWrite.ts` → إزالة `uiNotify` من `updateJsonSetting` وإعادة نتيجة Promise للمستهلِك.

### P3 — مراقبة barrel files (مستمر)
إضافة اختبار lint أو vitest يمنع أي `index.ts` جديد من استيراد `index.ts` آخر.

---

*تم الفحص بـ ripgrep — لم يُعدَّل أي ملف*
