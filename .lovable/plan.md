# خطة تنفيذ — إصلاح اتجاه التبعية في `types/`

تنفيذ البندَين الوحيدَين الفعليَين المُكتشَفَين في الفحص الجنائي. لا تغييرات أخرى.

## التغييرات

### 1. نقل `UnitInsert` إلى `types/forms/property.ts`

**الحالي:** `types/forms/property.ts:4` يستورد `UnitInsert` من `hooks/data/properties/useUnits` ← انتهاك اتجاه (types ← hooks).

**الإصلاح:**
- اجعل `types/forms/property.ts` المصدر الأساسي لـ `UnitInsert` (تعريف interface كامل).
- `hooks/data/properties/useUnits.ts` يستورد `UnitInsert` من `@/types/forms/property` ويُعيد تصديره للتوافق العكسي.

### 2. نقل `CrudNotifications` إلى `types/data/crudFactory.ts`

**الحالي:** `types/data/crudFactory.ts:6` يستورد `CrudNotifications` من `@/lib/notify` ← انتهاك اتجاه (types ← lib).

**الإصلاح:**
- نقل تعريف interface `CrudNotifications` إلى `types/data/crudFactory.ts` كمصدر أساسي.
- `lib/notify.ts` يستورد `CrudNotifications` من `@/types/data/crudFactory` ويُعيد تصديره للتوافق.
- `crudNotifyAdapter` يبقى في `lib/notify.ts` (لأنه دالة، ليس نوعاً).

## الملفات المُعدَّلة (4 فقط)

- `src/types/forms/property.ts` — إضافة تعريف `UnitInsert`
- `src/hooks/data/properties/useUnits.ts` — استيراد + re-export
- `src/types/data/crudFactory.ts` — إضافة تعريف `CrudNotifications`
- `src/lib/notify.ts` — استيراد + re-export

## ضمانات السلامة

- **توافق عكسي 100%:** كل re-exports محفوظة، لا استيراد قديم سينكسر
- **لا تغيير منطق:** فقط نقل تعريفات أنواع
- **لا تأثير على runtime:** types-only changes
- **لا تعديل ملفات محمية:** `client.ts`, `types.ts`, `config.toml`, `.env`

## التحقق

```bash
npx tsc --noEmit
```

## التقدير
~5 دقائق فعلية.