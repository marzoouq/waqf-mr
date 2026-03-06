

# خطة: تحسين صفحة إدارة المستخدمين على الجوال

## الحالة الفعلية

بعد فحص الكود، تبيّن أن **بطاقات الجوال موجودة بالفعل** (سطر 361-460) مع `md:hidden`، والجدول موجود مع `hidden md:block`.

## التحسينات المتبقية فعلاً

| التحسين | الحالة |
|---------|--------|
| بطاقات جوال | ✅ **موجودة بالفعل** |
| Desktop skeleton | ❌ نص بسيط بدلاً من `TableSkeleton` (سطر 356) |
| الجدول `hidden md:block` | ✅ موجود |

## التغيير الوحيد المطلوب

### `src/pages/dashboard/UserManagementPage.tsx` — سطر 356

استبدال:
```tsx
<p className="text-center py-8 text-muted-foreground hidden md:block">جاري التحميل...</p>
```

بـ:
```tsx
<div className="hidden md:block">
  <TableSkeleton rows={4} cols={5} />
</div>
```

مع استيراد `TableSkeleton` من `@/components/SkeletonLoaders`.

### ملف واحد يتغير، تغيير بسيط (سطرين)

