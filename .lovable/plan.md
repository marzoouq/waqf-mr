

# خطة إنشاء دالة `reopen_fiscal_year` RPC

## الهدف
إنشاء دالة RPC في قاعدة البيانات لإعادة فتح السنة المالية المقفلة، مع تسجيل السبب في سجل التدقيق، ثم إزالة `as any` من الكود.

## التحليل

الكود في `FiscalYearManagementTab.tsx` (سطر 144) يستدعي:
```typescript
supabase.rpc('reopen_fiscal_year' as any, {
  p_fiscal_year_id: fy.id,
  p_reason: reason,
})
```
ويتوقع أن تُرجع الدالة كائن JSON يحتوي على `label`.

## التنفيذ

### 1. Migration: إنشاء دالة `reopen_fiscal_year`

الدالة ستقوم بالتالي:
- التحقق من أن المستدعي هو الناظر (admin) فقط — لا يُسمح للمحاسب بإعادة الفتح (سلوك مقصود موثق في H-6)
- التحقق من أن السنة المالية موجودة وحالتها `closed`
- تحديث الحالة إلى `active`
- تسجيل العملية في `audit_log` مع السبب في `new_data`
- إرجاع `{ label }` للواجهة

```sql
CREATE OR REPLACE FUNCTION public.reopen_fiscal_year(
  p_fiscal_year_id uuid,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_label text;
  v_status text;
BEGIN
  -- الناظر فقط
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'غير مصرح بإعادة فتح السنة المالية';
  END IF;

  -- التحقق من الوجود والحالة
  SELECT label, status INTO v_label, v_status
  FROM fiscal_years WHERE id = p_fiscal_year_id;

  IF v_label IS NULL THEN
    RAISE EXCEPTION 'السنة المالية غير موجودة';
  END IF;
  IF v_status != 'closed' THEN
    RAISE EXCEPTION 'السنة المالية ليست مقفلة';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'سبب إعادة الفتح مطلوب';
  END IF;

  -- إعادة الفتح
  UPDATE fiscal_years SET status = 'active' WHERE id = p_fiscal_year_id;

  -- تسجيل في سجل التدقيق
  INSERT INTO audit_log (table_name, operation, record_id, old_data, new_data, user_id)
  VALUES (
    'fiscal_years', 'REOPEN', p_fiscal_year_id,
    jsonb_build_object('status', 'closed'),
    jsonb_build_object('status', 'active', 'reason', p_reason),
    auth.uid()
  );

  RETURN jsonb_build_object('label', v_label);
END;
$$;
```

### 2. إزالة `as any` من الكود

في `FiscalYearManagementTab.tsx` سطر 144:
```typescript
// قبل:
await supabase.rpc('reopen_fiscal_year' as any, { ... });
// بعد:
await supabase.rpc('reopen_fiscal_year', { ... });
```

ملاحظة: بعد تنفيذ الـ migration، سيتم تحديث `types.ts` تلقائيا وستتعرف TypeScript على الدالة بدون الحاجة للـ cast.

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| Migration جديد | إنشاء دالة `reopen_fiscal_year` |
| `src/components/settings/FiscalYearManagementTab.tsx` | إزالة `as any` من سطر 144 |
