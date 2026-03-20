

# تقرير الفحص الإضافي العميق — التحقق النهائي قبل التنفيذ

---

## الإصلاح 1: Auth.tsx — استبدال useEffect بـ useQuery مخصص

### الوضع الحالي (سطر 16, 78-95)
```typescript
const [registrationEnabled, setRegistrationEnabled] = useState(false);
// ...
useEffect(() => {
  supabase.from('app_settings').select('value').eq('key','registration_enabled').maybeSingle()
  // ...
}, []);
```

### التحقق من RLS
سياسة `Anon can read registration_enabled` تسمح فقط بـ `key = 'registration_enabled'` — مطابقة تماماً للاستعلام الحالي. ✅

### لماذا لا نستخدم `useAppSettings()`؟
- يستعلم `SELECT key, value FROM app_settings` **بدون فلتر**
- للمستخدم المجهول: RLS ترجع صفاً واحداً فقط → يُخزَّن في cache بمفتاح `['app-settings-all']`
- بعد تسجيل الدخول في نفس الجلسة: صفحات أخرى تقرأ من نفس الـ cache الناقص حتى انتهاء `staleTime`
- **خطر فعلي**: 5 دقائق من إعدادات ناقصة بعد تسجيل الدخول

### الحل الآمن
استبدال `useState + useEffect` بـ `useQuery` مخصص بمفتاح منفصل:
```typescript
import { useQuery } from '@tanstack/react-query';

// بدل useState + useEffect:
const { data: registrationEnabled = false } = useQuery({
  queryKey: ['registration-enabled'],
  queryFn: async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'registration_enabled')
      .maybeSingle();
    return data?.value === 'true';
  },
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
});
```
- **لا تعارض مع `['app-settings-all']`** — مفتاح cache مختلف ✅
- **يعمل للمجهول** — نفس الاستعلام المفلتر ✅
- **يُلغي الاستعلام المكرر** عند إعادة فتح الصفحة ✅

---

## الإصلاح 2: BeneficiarySettingsPage.tsx — تحديد queryKey

### التحقق
- السطر 42: `queryClient.invalidateQueries()` — بدون queryKey = يُبطل **كل** الـ cache
- يُستدعى فقط من زر "إعادة المحاولة" عند `benError` (سطر 111)
- `useBeneficiariesSafe` يستخدم queryKey `['beneficiaries-safe']`

### فحص التأثير الجانبي
عند الضغط على "إعادة المحاولة" حالياً: يُبطل cache كل الصفحات → إذا كان المستفيد في تبويب آخر يُعاد تحميل كل شيء. **مشكلة أداء حقيقية.**

### الحل
```typescript
const handleRetry = useCallback(
  () => queryClient.invalidateQueries({ queryKey: ['beneficiaries-safe'] }),
  [queryClient]
);
```
- **لا تعارض** — الزر يظهر فقط عند خطأ في تحميل بيانات المستفيد ✅
- **لا يُبطل cache غير ذي صلة** ✅

---

## الإصلاح 3: Index.tsx — تبسيط SVG pattern

### التحقق
السطر 119-122 يحتوي 3 عناصر زخرفية إضافية:
```xml
<circle cx="60" cy="60" r="4" .../>     ← دائرة صغيرة بالكاد مرئية
<line x1="60" y1="0" x2="60" y2="120"/> ← خط عمودي
<line x1="0" y1="60" x2="120" y2="60"/> ← خط أفقي
```
- الأنماط الأساسية (3 ماسات + دائرة كبيرة) تبقى
- **لا تعارض بصري جوهري** — العناصر المحذوفة بـ `strokeWidth: 0.2-0.3` وبالكاد مرئية عند `opacity: 0.07`

### الحل
حذف السطور 120-122 (3 عناصر SVG)

---

## الإصلاح 4: BeneficiaryDashboard.tsx — useMemo للتواريخ

### التحقق
السطور 81-83:
```typescript
const hijriDate = now.toLocaleDateString('ar-SA-u-ca-islamic', ...);
const gregorianDate = now.toLocaleDateString('ar-SA', ...);
const timeStr = now.toLocaleTimeString('ar-SA', ...);
```
- `now` يتغير كل 60 ثانية (من `setInterval` سطر 66)
- بدون `useMemo`: تُحسب كل render (حتى لو تغير state آخر)
- **تحسين طفيف** لكن بدون مخاطر

### الحل
```typescript
const { hijriDate, gregorianDate, timeStr } = useMemo(() => ({
  hijriDate: now.toLocaleDateString('ar-SA-u-ca-islamic', { weekday:'long', year:'numeric', month:'long', day:'numeric' }),
  gregorianDate: now.toLocaleDateString('ar-SA', { year:'numeric', month:'long', day:'numeric' }),
  timeStr: now.toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit' }),
}), [now]);
```

---

## ملخص الحكم النهائي

| # | الملف | الحكم | مخاطر |
|---|-------|-------|-------|
| 1 | Auth.tsx | ✅ آمن (useQuery مخصص بدل useAppSettings) | صفر |
| 2 | BeneficiarySettingsPage.tsx | ✅ آمن | صفر |
| 3 | Index.tsx | ✅ آمن (تجميلي) | طفيف بصرياً |
| 4 | BeneficiaryDashboard.tsx | ✅ آمن (تحسين طفيف) | صفر |

**لا توجد تعارضات أو مشاكل. الخطة جاهزة للتنفيذ.**

