

# تقرير التدقيق المعماري — الجولة الثالثة

## الحالة العامة

البنية **نظيفة ومنظمة جيدًا** بعد الجولتين السابقتين. معظم التوصيات السابقة نُفذت بنجاح:

- ✅ توحيد `useAuth` — بقي استيراد واحد فقط في `App.tsx` من `@/contexts/AuthContext` (مقبول: يستورد `AuthProvider`)
- ✅ حذف ملفات re-export المهملة (`use-toast.ts`, `toaster.tsx`, `toast.tsx`)
- ✅ فصل toast عن data hooks — **12 ملف** في `src/hooks/data/` يستخدمون `defaultNotify` بدل `toast` مباشرة
- ✅ تقسيم `useAdvanceRequests.ts` (167 سطر الآن)
- ✅ نقل اختبار `findAccountByFY` إلى `src/utils/`
- ✅ توثيق `lib/` و `utils/` عبر README

---

## المشاكل المتبقية

### 1. [متوسط] toast ما زال مباشرًا في `src/hooks/financial/` (6 ملفات)

الملفات التالية تستورد `toast` من `sonner` مباشرة بدل `defaultNotify`:

| ملف | نوع الاستخدام |
|---|---|
| `useDistribute.ts` | mutation نتائج التوزيع |
| `useAccountsActions.ts` | حذف/إعادة ضبط حسابات |
| `useAccountsEditing.ts` | تعديل تحصيل |
| `useContractAllocations.ts` | mutation توزيعات العقود |
| `useTotalBeneficiaryPercentage.ts` | تنبيه تجاوز 100% |
| `useMySharePage.ts` | تنبيهات PDF |

هذه أقل خطورة من data hooks لأنها **financial/page hooks** (أقرب للواجهة)، لكن يمكن توحيدها مع `defaultNotify` للاتساق.

### 2. [متوسط] toast مباشر في page hooks (10+ ملف)

ملفات `src/hooks/page/` مثل `useAppSettings`, `useDisclosurePage`, `useZatcaSettings`, `useBylawsPage`, `usePropertiesPage`, إلخ — تستورد toast مباشرة. هذا **مقبول أكثر** لأن page hooks هي الطبقة الأقرب لـ UI، لكن التوحيد يُحسّن الاتساق.

### 3. [صغير] `useCrudFactory.ts` يستورد toast مباشرة بالإضافة لـ defaultNotify

الـ factory يستخدم `toast` كـ default fallback — هذا مقبول معماريًا لأنه نقطة مركزية واحدة.

### 4. [صغير] `App.tsx` يستورد `useAuth` من مسارين

```ts
import { AuthProvider, useAuth } from "@/contexts/AuthContext";  // AuthProvider + useAuth
```

`AuthProvider` موجود فقط في `AuthContext.tsx` لذا الاستيراد منطقي، لكن `useAuth` يُعاد تصديره هنا بينما كل الملفات الأخرى تستورده من `@/hooks/auth/useAuthContext`. يمكن استيراد `useAuth` منفصلًا.

---

## التوصيات — مرتبة حسب الأولوية

| # | الأولوية | الخطوة | الجهد |
|---|---|---|---|
| 1 | متوسط | تعميم `defaultNotify` على 6 ملفات في `hooks/financial/` | صغير |
| 2 | صغير | فصل استيراد `useAuth` في `App.tsx` ليأتي من `@/hooks/auth/useAuthContext` | دقيقة واحدة |
| 3 | اختياري | تعميم `defaultNotify` على page hooks (10+ ملف) — أقل أهمية لأنها قريبة من UI | متوسط |

---

## الخلاصة

**البنية الحالية نظيفة وجاهزة للإنتاج.** المشاكل المتبقية هي تحسينات اتساق (consistency) وليست مشاكل معمارية. الفصل بين طبقات البيانات (`hooks/data/`) والواجهة (`hooks/page/`) واضح. لا توجد ملفات في مكان خاطئ، ولا dead code، ولا اقتران خطير.

