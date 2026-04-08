

# خطة تنفيذ توصيات تقرير التدقيق

## الخطوة 1: إصلاح الألوان الثابتة — 4 ملفات 🔴

التوكنات `--success`, `--warning`, `--info` موجودة بالفعل في `index.css`.

| الملف | قبل | بعد |
|-------|------|------|
| `PasswordStrengthBar.tsx` | `bg-orange-500` | `bg-warning` |
| | `bg-yellow-500` | `bg-warning/70` |
| | `bg-green-500`, `text-green-600` | `bg-success`, `text-success` |
| `AccountantDashboardView.tsx` | `text-white` (سطر 37) | `text-primary-foreground` |
| `AdminCapabilitiesSummary.tsx` | 7 مجموعات بألوان ثابتة (`text-blue-700`, `bg-blue-50`, إلخ) | استبدال بتدرجات `primary/muted/accent` أو ألوان من CSS tokens (`chart-1..5`, `success`, `warning`, `info`) |
| `LandingHero.tsx` | `text-white` × 4 | **استثناء مقبول** — الخلفية `gradient-hero` ثابتة، `text-white` هو الخيار الصحيح هنا. لا تغيير. |

**ملفات متأثرة**: 3 (LandingHero مستثنى)

---

## الخطوة 2: حذف 5 barrel files ميتة 🟡

تأكدنا أن **صفر ملفات** تستورد من هذه المسارات:

- `src/hooks/data/index.ts` — حذف
- `src/hooks/page/index.ts` — حذف
- `src/hooks/page/admin/index.ts` — حذف
- `src/hooks/financial/index.ts` — حذف
- `src/hooks/data/financial/index.ts` — حذف

**ملفات متأثرة**: 5 حذف، صفر تعديل

---

## الخطوة 3: تقسيم `themeDefinitions.ts` (302 سطر) 🟡

الملف عبارة عن مصفوفة من 6 ثيمات × (light + dark). يُقسم إلى:

```
src/lib/theme/themes/
  islamicGreen.ts
  royalBlue.ts
  ... (ملف لكل ثيم)
  index.ts  ← يجمعها في مصفوفة themes[]
```

`themeDefinitions.ts` يحتفظ بـ `ThemeVars` و `ThemeTemplate` types فقط.

**ملفات متأثرة**: 1 → ~8 ملفات جديدة، صفر تعديل في المستهلكين (التصدير عبر `lib/theme/index.ts` لا يتغير)

---

## الخطوة 4: إضافة README لـ `hooks/financial/` و `hooks/data/financial/` 🟡

ملفا توثيق قصيران يشرحان:
- `hooks/financial/` = منطق أعمال بحت (حسابات، تجميع، أداء) — لا Supabase
- `hooks/data/financial/` = استعلامات بيانات (useQuery/useMutation) — Supabase فقط

**ملفات متأثرة**: 2 ملف README جديد

---

## الخطوة 5: تقسيم ملفات PDF الكبيرة 🟢

- `comprehensiveBeneficiary.ts` (281 سطر) → استخراج أقسام التقرير إلى helpers
- `accounts.ts` (267 سطر) → استخراج بناء الجداول
- `forensicAudit.ts` (233 سطر) → استخراج أقسام التقرير

**ملفات متأثرة**: 3 → ~9 ملفات

---

## الخطوة 6: فصل فلترة/حسابات `useInvoicesPage.ts` 🟢

تقسيم إلى:
- `useInvoicesPage.ts` — orchestrator
- `useInvoicesFilters.ts` — فلترة وبحث

**ملفات متأثرة**: 1 → 2

---

## ملخص التأثير

| الخطوة | ملفات جديدة | ملفات محذوفة | ملفات معدّلة |
|--------|-------------|-------------|-------------|
| 1 | 0 | 0 | 3 |
| 2 | 0 | 5 | 0 |
| 3 | ~8 | 0 | 1 |
| 4 | 2 | 0 | 0 |
| 5 | ~6 | 0 | 3 |
| 6 | 1 | 0 | 1 |
| **المجموع** | **~17** | **5** | **8** |

