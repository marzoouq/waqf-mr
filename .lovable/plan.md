

# خطة إصلاح أعلى 3 أولويات من تقرير الـ 100 ملاحظة

## الإصلاحات الثلاثة

### 🔴 #1 — توحيد `CLEARABLE_STORAGE_KEYS` (ملاحظة #3, #23)
**المشكلة:** `AuthContext.tsx` يحتوي مصفوفة hardcoded بـ 9 مفاتيح، بينما `storageKeys.ts` يصدّر 17. مفاتيح حساسة (`BIOMETRIC_ENABLED`, `WEBAUTHN_LAST_CHECK`, `PWA_*`) **لا تُحذف عند logout** — خطر أمني.

**الحل:** حذف المصفوفة المحلية، استيراد `CLEARABLE_STORAGE_KEYS` من `@/constants/storageKeys`، استخدامها مع `safeRemove`.

**نطاق محدود:** فقط داخل `signOut()` — لا مساس بـ login/session/role.

---

### 🔴 #2 — مسح `fiscal_year_id` من sessionStorage عند logout (ملاحظة #1, #2)
**المشكلتان:**
1. `signOut()` يمسح localStorage فقط — يترك `fiscal_year_id` في sessionStorage → بعد login بمستخدم آخر تظل السنة القديمة
2. `FiscalYearContext` يستدعي `supabase.auth.signOut()` مباشرة → يتجاوز cleanup الكامل

**الحل:**
- في `AuthContext.signOut()`: إضافة `safeSessionRemove('fiscal_year_id')`
- في `FiscalYearContext`: استبدال الاستدعاء المباشر بـ `signOut()` من `useAuth()`

**يحترم الذاكرة:** `fiscal_year_id` يبقى في sessionStorage، يُمسح فقط عند logout.

---

### 🟠 #3 — حل تضارب التسمية (ملاحظة #4, #5)
**المشكلة:** نفس الاسم بنوعين في ملفين:
- `navigation.ts` → `Record<string, string>` (route→key)
- `sections.ts` → `readonly string[]`

**الحل:** إعادة تسمية في `navigation.ts`:
- `ADMIN_SECTION_KEYS` → `ADMIN_ROUTE_TO_SECTION`
- `BENEFICIARY_SECTION_KEYS` → `BENEFICIARY_ROUTE_TO_SECTION`

ثم تحديث المستوردين بناءً على الاستخدام الفعلي (Record vs Array) عبر بحث شامل.

---

## الملفات المتأثرة

| ملف | إجراء |
|-----|------|
| `src/contexts/AuthContext.tsx` | استخدام `CLEARABLE_STORAGE_KEYS` + `safeSessionRemove('fiscal_year_id')` |
| `src/contexts/FiscalYearContext.tsx` | استبدال `supabase.auth.signOut()` بـ `useAuth().signOut()` |
| `src/constants/navigation.ts` | إعادة تسمية المتغيرين |
| مستوردو الـ Record | تحديث الاسم في كل موقع استخدام |

## التحقق
- `npx tsc --noEmit` بعد كل إصلاح
- بحث شامل لاستيرادات الأسماء القديمة
- مراجعة يدوية لـ `signOut()` للتأكد من عدم لمس منطق session/role

## الضمانات
- صفر تغيير على منطق المصادقة الفعلي (login/onAuthStateChange/role)
- صفر تغيير على FiscalYearContext logic — فقط مصدر signOut
- إعادة التسمية لا تغيّر السلوك
- محترم لقواعد الذاكرة: `fiscal_year_id` في sessionStorage حصراً

