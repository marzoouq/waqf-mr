

# فحص جنائي محاسبي — لوحة المحاسب

---

## المنهجية

فحص شامل لكل ما يراه المحاسب: الصفحات المتاحة، الأقسام المحظورة، أزرار الإجراءات، الشريط الجانبي، الشريط السفلي، تناسق الصلاحيات بين Sidebar و Route Guards.

---

## النتائج

### 🔴 F-01: المحاسب يرى رابط "تشخيص النظام" لكنه محظور عند النقر (متوسطة)

**التعارض:**
- `ACCOUNTANT_EXCLUDED_ROUTES` = `['/dashboard/users', '/dashboard/settings', '/dashboard/zatca']` — **لا يشمل `/dashboard/diagnostics`**
- `App.tsx` سطر 154: `<ProtectedRoute allowedRoles={['admin']}>` — **admin فقط**

**السيناريو:** المحاسب يفتح القائمة الجانبية ← يرى "تشخيص النظام" ← ينقر ← يُحوَّل لصفحة "غير مصرّح". تجربة مستخدم سيئة.

**الإصلاح:** إضافة `'/dashboard/diagnostics'` إلى `ACCOUNTANT_EXCLUDED_ROUTES`.

---

### 🔴 F-02: المحاسب يرى رابط "واجهة المستفيد" لكنه محظور (متوسطة)

**التعارض:**
- `allAdminLinks` يحتوي على `{ to: '/beneficiary', ... }` — يظهر لكل الأدوار الإدارية
- `ACCOUNTANT_EXCLUDED_ROUTES` — **لا يشمل `/beneficiary`**
- `App.tsx` سطر 157: `allowedRoles={['admin', 'beneficiary']}` — **لا يشمل accountant**

**السيناريو:** المحاسب يرى "واجهة المستفيد" في الشريط الجانبي ← ينقر ← يُحوَّل لصفحة "غير مصرّح".

**الإصلاح:** إضافة `'/beneficiary'` إلى `ACCOUNTANT_EXCLUDED_ROUTES`.

---

### ✅ F-03: أزرار الإجراءات السريعة — سليمة

المحاسب يرى 4 أزرار مخصصة (سطر 292-317):
| الزر | المسار | متاح للمحاسب؟ |
|------|--------|:---:|
| تسجيل دخل | `/dashboard/income` | ✅ |
| تسجيل مصروف | `/dashboard/expenses` | ✅ |
| الحسابات الختامية | `/dashboard/accounts` | ✅ |
| إدارة الفواتير | `/dashboard/invoices` | ✅ |

جميعها مسارات صالحة ومتاحة للمحاسب.

---

### ✅ F-04: الشريط السفلي (BottomNav) — سليم

المحاسب يرى 4 روابط مخصصة + زر "المزيد":
| الرابط | المسار | متاح؟ |
|--------|--------|:---:|
| الرئيسية | `/dashboard` | ✅ |
| الدخل | `/dashboard/income` | ✅ |
| المصروفات | `/dashboard/expenses` | ✅ |
| الفواتير | `/dashboard/invoices` | ✅ |

---

### ✅ F-05: تطابق الصلاحيات (Sidebar vs Route Guard)

| المسار | في Sidebar | في Route Guard | متطابق؟ |
|--------|:---:|:---:|:---:|
| `/dashboard` | ✅ | admin, accountant | ✅ |
| `/dashboard/properties` | ✅ | admin, accountant | ✅ |
| `/dashboard/contracts` | ✅ | admin, accountant | ✅ |
| `/dashboard/income` | ✅ | admin, accountant | ✅ |
| `/dashboard/expenses` | ✅ | admin, accountant | ✅ |
| `/dashboard/beneficiaries` | ✅ | admin, accountant | ✅ |
| `/dashboard/reports` | ✅ | admin, accountant | ✅ |
| `/dashboard/accounts` | ✅ | admin, accountant | ✅ |
| `/dashboard/messages` | ✅ | admin, accountant | ✅ |
| `/dashboard/invoices` | ✅ | admin, accountant | ✅ |
| `/dashboard/audit-log` | ✅ | admin, accountant | ✅ |
| `/dashboard/bylaws` | ✅ | admin, accountant | ✅ |
| `/dashboard/support` | ✅ | admin, accountant | ✅ |
| `/dashboard/annual-report` | ✅ | admin, accountant | ✅ |
| `/dashboard/chart-of-accounts` | ✅ | admin, accountant | ✅ |
| `/dashboard/comparison` | ✅ | admin, accountant | ✅ |
| `/dashboard/users` | ❌ محظور | admin only | ✅ |
| `/dashboard/settings` | ❌ محظور | admin only | ✅ |
| `/dashboard/zatca` | ❌ محظور | admin only | ✅ |
| `/dashboard/diagnostics` | ⚠️ **يظهر** | admin only | 🔴 **تعارض** |
| `/beneficiary` | ⚠️ **يظهر** | admin, beneficiary | 🔴 **تعارض** |

---

### ✅ F-06: مراقبة أداء الصفحات — محصّنة

`PagePerformanceCard` يظهر فقط عند `role === 'admin'` (سطر 413). المحاسب لا يراه. ✅

---

### ✅ F-07: Console & Network Errors — صفر

لا أخطاء في الكونسول أو الشبكة.

---

## ملخص

| # | البند | الحالة | أولوية |
|---|-------|--------|--------|
| F-01 | رابط "تشخيص النظام" يظهر للمحاسب (محظور) | 🔴 تعارض | متوسطة |
| F-02 | رابط "واجهة المستفيد" يظهر للمحاسب (محظور) | 🔴 تعارض | متوسطة |
| F-03 | أزرار الإجراءات السريعة | ✅ سليم | — |
| F-04 | الشريط السفلي | ✅ سليم | — |
| F-05 | تطابق 17 مسار Sidebar/Route | ✅ سليم | — |
| F-06 | مراقبة الأداء (admin only) | ✅ محصّن | — |
| F-07 | أخطاء Console/Network | ✅ صفر | — |

---

## الإصلاح المطلوب

**ملف واحد — سطر واحد:** تحديث `ACCOUNTANT_EXCLUDED_ROUTES` في `constants.ts`:

```typescript
// قبل:
export const ACCOUNTANT_EXCLUDED_ROUTES = ['/dashboard/users', '/dashboard/settings', '/dashboard/zatca'];

// بعد:
export const ACCOUNTANT_EXCLUDED_ROUTES = ['/dashboard/users', '/dashboard/settings', '/dashboard/zatca', '/dashboard/diagnostics', '/beneficiary'];
```

هذا يمنع ظهور الروابط المحظورة في القائمة الجانبية للمحاسب.

