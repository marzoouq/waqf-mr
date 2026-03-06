

# خطة إصلاح الجولة السابعة — مؤكدة بعد التحقق من الكود الحي

## نتائج التحقق

| المشكلة | التحقق |
|---|---|
| DisclosurePage بدون `.limit()` | ✅ مؤكدة — سطر 92 بدون limit |
| RolePermissionsTab — disclosure للواقف | ✅ مؤكدة — سطر 21 يعرض waqif لكن Route يحجبه |
| rolePermissions — مفاتيح غائبة | ⚠️ تحقق جزئي — `messages` و `invoices` غائبان من waqif، لكن Routes في App.tsx تسمح للواقف بهما فعلاً (سطور 143-144). إذن `undefined → true` هو السلوك **الصحيح** هنا! لا حاجة لتغيير |
| PDF نسب ثابتة | ✅ مؤكدة — 4 مواضع: سطور 42, 43, 144, 145 |

## تعديل الخطة بعد التحقق

**تم إلغاء إصلاح #3** (rolePermissions.ts): بما أن Routes تسمح للواقف بالمراسلات والفواتير، فإن غياب المفاتيح يُنتج `undefined !== false → true` وهو **السلوك المطلوب**. إضافة `messages: false` ستحجب الواقف عن صفحة يُفترض أن يصل إليها.

---

## الإصلاحات المؤكدة (3 تعديلات)

### 1. DisclosurePage — إضافة `.limit(200)`
**ملف:** `src/pages/beneficiary/DisclosurePage.tsx` سطر 92

```typescript
// قبل:
.order('date', { ascending: false });
// بعد:
.order('date', { ascending: false })
.limit(200);
```

### 2. RolePermissionsTab — إزالة waqif من disclosure
**ملف:** `src/components/settings/RolePermissionsTab.tsx` سطر 21

```typescript
// قبل:
{ key: 'disclosure', label: 'الإفصاح السنوي', roles: ['beneficiary', 'waqif'] },
// بعد:
{ key: 'disclosure', label: 'الإفصاح السنوي', roles: ['beneficiary'] },
```

الواقف محجوب فعلاً عن صفحة الإفصاح في `ProtectedRoute`، فلا معنى لعرض خيار التفعيل في الإعدادات.

### 3. PDF beneficiary.ts — نسب ديناميكية
**ملف:** `src/utils/pdf/beneficiary.ts` — 4 مواضع

في `generateMySharePDF` (سطور 42-43):
```typescript
const adminPct = data.netRevenue > 0 ? Math.round(data.adminShare / data.netRevenue * 100) : 10;
const waqifPct = data.netRevenue > 0 ? Math.round(data.waqifShare / data.netRevenue * 100) : 5;
// ثم:
[`(-) حصة الناظر (${adminPct}%)`, ...],
[`(-) حصة الواقف (${waqifPct}%)`, ...],
```

في `generateDisclosurePDF` (سطور 144-145) — نفس المنطق.

---

## ملخص

| الملف | التغيير |
|---|---|
| `DisclosurePage.tsx` | إضافة `.limit(200)` |
| `RolePermissionsTab.tsx` | إزالة waqif من disclosure |
| `pdf/beneficiary.ts` | حساب النسب ديناميكياً (4 مواضع) |

3 تعديلات في 3 ملفات. لا تغييرات في قاعدة البيانات.

