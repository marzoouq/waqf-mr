

# خطة التنفيذ — إصلاح الملاحظات الجنائية

## الحالة الحالية

خطأ البناء الحالي (HTTP 429) هو تقييد معدل طلبات من npm registry وليس خطأ كود — سيُحل تلقائياً. لكن هناك 3 مشاكل كود حقيقية يجب إصلاحها:

---

## المشاكل والحلول

### 1. تعارض الأنواع في ContractsFiltersBar (متوسط)

**الملف:** `src/components/contracts/ContractsFiltersBar.tsx`

**التشخيص:** `statusFilter` و `setStatusFilter` مُعرَّفان كـ `string` بينما المصدر في `useContractsFilters` يستخدم `StatusFilterValue`. حالياً لا يمنع البناء (TypeScript يسمح بالتمرير bivariantly في بعض الحالات)، لكنه يفقد سلامة الأنواع.

**الحل:** استيراد `StatusFilterValue` وتحديث Props:
```typescript
import type { StatusFilterValue } from '@/hooks/page/useContractsFilters';

interface Props {
  statusFilter: StatusFilterValue;
  setStatusFilter: (f: StatusFilterValue) => void;
  // ... باقي الخصائص بدون تغيير
}
```

**ملف واحد يتأثر.**

---

### 2. NotificationItem = any (منخفض)

**الملف:** `src/pages/beneficiary/notifications/NotificationsList.tsx`

**التشخيص:** النوع `any` يُفقد كل فحوصات TypeScript. الحقول المستخدمة فعلياً من استعلام `useNotifications` هي: `id, title, message, type, is_read, link, created_at, user_id`.

**الحل:** تعريف واجهة صريحة:
```typescript
interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
  user_id: string;
}
```

**ملف واحد يتأثر.**

---

### 3. @ts-ignore في arabicReshaper (منخفض)

**الملف:** `src/utils/pdf/arabicReshaper.ts`

**التشخيص:** مكتبة `arabic-reshaper` بدون تعريفات TypeScript، يُستخدم `@ts-ignore` للتجاوز.

**الحل:** إنشاء ملف declaration:
```
src/types/arabic-reshaper.d.ts
```
```typescript
declare module 'arabic-reshaper' {
  export function convertArabic(text: string): string;
}
```
ثم حذف سطري `@ts-ignore` و `eslint-disable` من `arabicReshaper.ts`.

**ملفان يتأثران.**

---

## ملخص التغييرات

| # | الملف | التغيير |
|---|-------|---------|
| 1 | `ContractsFiltersBar.tsx` | استيراد `StatusFilterValue` + تحديث نوعين في Props |
| 2 | `NotificationsList.tsx` | استبدال `any` بواجهة `NotificationItem` صريحة |
| 3 | `src/types/arabic-reshaper.d.ts` | ملف جديد — declaration للمكتبة |
| 4 | `arabicReshaper.ts` | حذف `@ts-ignore` و `eslint-disable` |

**إجمالي الملفات المتأثرة:** 4 ملفات، تغييرات minimal بدون أي تأثير على السلوك الوظيفي.

