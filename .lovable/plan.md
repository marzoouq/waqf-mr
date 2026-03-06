

# خطة: إصلاح المشاكل المتبقية من تقرير الفحص الجنائي

## نتائج التحقق المنهجي

### ✅ تم تنفيذه بالفعل (مؤكد من الكود):
1. **isActive للمسارات الفرعية** — مُصلَح في `Sidebar.tsx:67-69`
2. **sidebarOpen في localStorage** — مُصلَح في `DashboardLayout.tsx:136-144`
3. **Swipe تفاعلي بـ rAF** — مُصلَح في `DashboardLayout.tsx:157-238`
4. **Haptic feedback** — مُصلَح (`navigator.vibrate(15)` في سطر 202 و 234)
5. **زر المساعد الذكي فوق الشريط السفلي** — مُصلَح في `AiAssistant.tsx`
6. **COLORS و formatArabicMonth خارج component** — مُصلَح في `AdminDashboard.tsx:22-30`

### ❌ مشاكل لا تزال قائمة (4 إصلاحات):

---

## التغييرات المطلوبة

### 1. `tooltipStyle` خارج الـ component (AdminDashboard.tsx)
**السطر 162** — لا يزال داخل الدالة، يُعاد إنشاؤه كل render.

نقله إلى مستوى الملف (بعد سطر 30):
```tsx
const tooltipStyle = { direction: 'rtl' as const, textAlign: 'right' as const, fontFamily: 'inherit' };
```
وحذف السطر 162.

### 2. تناقض نسبة التحصيل بين AdminDashboard و WaqifDashboard

- **AdminDashboard** (سطر 166): يستخدم `collectionSummary.percentage` (مبني على حالة الفواتير — الأدق)
- **WaqifDashboard** (سطر 63): يستخدم `totalIncome / contractualRevenue` (حساب بسيط — غير دقيق)

**الحل**: توحيد WaqifDashboard ليستخدم نفس منطق الفواتير. يحتاج استيراد `usePaymentInvoices` (مستورد أصلاً سطر 13) وحساب `collectionSummary` بنفس المنطق.

### 3. `signIn` loading لا ينتهي عند النجاح (AuthContext.tsx)

**السطر 177-183** — `setLoading(false)` فقط عند الخطأ. عند النجاح، يعتمد على `onAuthStateChange` → `fetchRole` لإنهاء الـ loading. هذا التصميم **مقصود** لكن يحتاج safety net.

**الحل**: إضافة `setLoading(false)` في finally أو بعد النجاح مباشرة — لكن بما أن `fetchRole` يُنهي الـ loading، الأفضل إضافة timeout كحماية:
```tsx
const signIn = async (email: string, password: string) => {
  setLoading(true);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setLoading(false);
  }
  // Safety: fetchRole will set loading=false on success,
  // but if it doesn't fire within 5s, force it
  setTimeout(() => setLoading(false), 5000);
  return { error };
};
```

### 4. جداول الحسابات بدون `overflow-x-auto` (4 ملفات)

| الملف | السطر | الحالة |
|-------|-------|--------|
| `AccountsExpensesTable.tsx:25` | `<Table>` بدون wrapper | ❌ |
| `AccountsIncomeTable.tsx:25` | `<Table>` بدون wrapper | ❌ |
| `AccountsSavedTable.tsx:39` | `min-w-[750px]` بدون wrapper | ❌ |
| `AccountsCollectionTable.tsx:62` | `min-w-[850px]` بدون wrapper | ❌ |

**الحل**: تغليف كل `<Table>` بـ `<div className="overflow-x-auto">`.

### 5. AccountsSavedTable — loading skeleton بدلاً من نص

استبدال "جاري التحميل..." (سطر 30-31) بـ Skeleton components.

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/dashboard/AdminDashboard.tsx` | نقل `tooltipStyle` خارج component |
| `src/pages/beneficiary/WaqifDashboard.tsx` | توحيد حساب نسبة التحصيل مع AdminDashboard |
| `src/contexts/AuthContext.tsx` | إضافة safety timeout لـ signIn loading |
| `src/components/accounts/AccountsExpensesTable.tsx` | إضافة `overflow-x-auto` |
| `src/components/accounts/AccountsIncomeTable.tsx` | إضافة `overflow-x-auto` |
| `src/components/accounts/AccountsSavedTable.tsx` | إضافة `overflow-x-auto` + skeleton loading |
| `src/components/accounts/AccountsCollectionTable.tsx` | إضافة `overflow-x-auto` |

