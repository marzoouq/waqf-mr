# خطة مُصحَّحة — بعد مراجعة جنائية للخطة نفسها

## الأخطاء التي اكتشفتها في الخطة السابقة وصحَّحتها

| الخطأ في خطتي | الواقع | التصحيح |
|---|---|---|
| كتبت مسار `useSettingsPage` كـ `src/hooks/application/messaging/useSettingsPage.ts` | المسار الفعلي `src/hooks/page/admin/management/useSettingsPage.ts` | استخدام المسار الصحيح |
| اقترحتُ إضافة `labelKey: 'distributions'` فقط في `routeRegistry.ts` | `labelKey` نوعه `keyof MenuLabels` (نوع صارم في `src/types/navigation.ts`)، ولا توجد فيه قيمة `distributions` | يجب أولاً إضافة `distributions` إلى `MenuLabels` interface و `defaultMenuLabels`، ثم استخدامها في routeRegistry |
| اقترحتُ إضافة `toast` داخل `useMessaging.ts` (طبقة data) | يخالف قاعدة الذاكرة الأساسية: **"No Toast in Data Hooks — hooks/data نقي، الإشعارات في hooks/page wrappers"** | نقل الـtoast إلى `useMessagesPage.ts` (application) و `useBeneficiaryMessages.ts` (page beneficiary) |

---

## الخطة النهائية — 17 إصلاحاً موزّعة على فئات

### 🔴 P0 — أمن (3 بنود، بعضها خارج نطاق الكود)

**1. `.env` متعقَّب في git (بند #1)**  
خارج نطاق Lovable — أنبّه المستخدم بتنفيذ يدوي: `git rm --cached .env && git commit`. لا أعدّل `.env` (محمي).

**2. عدم وجود headers أمنية فعلية (بنود #7-8)**  
إنشاء `public/_headers`:
```
/*
  Content-Security-Policy: frame-ancestors 'self'
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

**3. لا CI gate ضد `.env` (بند #10)**  
إضافة خطوة `gitleaks-action` في `.github/workflows/ci.yml` لرفض أي commit يحوي أسراراً.

---

### 🟡 P1 — توافق صارم مع الأنواع (بند 1)

**4. `/dashboard/distributions` بلا `labelKey` (بند #17)**  
- **`src/types/navigation.ts`**: إضافة `distributions: string` إلى `MenuLabels` interface و `'توزيع الحصص'` إلى `defaultMenuLabels`.
- **`src/constants/routeRegistry.ts:34`**: إضافة `labelKey: 'distributions'` على مدخل `/dashboard/distributions`.

---

### ♿ Accessibility (10 بنود)

**5. بطاقات `DashboardStatsGrid` بلا `aria-label` (#31)**  
`DashboardStatsGrid.tsx:22-35` — إضافة `aria-label={\`فتح صفحة ${stat.label}\`}` على كل `<Link>`.

**6. `aria-hidden` ناقص على 3 أيقونات في `DashboardAlerts` (#32)**  
السطور 47 (AlertTriangle), 78 (Banknote), 95 (Clock), 110 (AlertTriangle) — إضافة `aria-hidden="true"`.

**7. لا احترام لـ `prefers-reduced-motion` (#33)**  
استبدال `animate-fade-in` بـ `motion-safe:animate-fade-in` في `DashboardStatsGrid` و `DashboardAlerts`.

**8. `SettingsPage` لا يدعم deep link `?tab=` (#54)**  
**`src/hooks/page/admin/management/useSettingsPage.ts`** (المسار الصحيح) — استبدال `useState(defaultTab)` بـ `useSearchParams` للقراءة والكتابة من/إلى URL.

**9. Focus trap جزئي في mobile sidebar (#74)**  
`DashboardLayout.tsx:48-62` — إضافة معالج `keydown` للـ`Tab/Shift+Tab` يدور بين أول وآخر عنصر قابل للتركيز داخل الـdialog.

**10. لا Skip Link (#76) و `<main>` بلا `id` (#77)**  
`DashboardLayout.tsx` — إضافة:
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded">
  تخطي إلى المحتوى الرئيسي
</a>
```
وتعديل `<main>` ليصبح `<main id="main-content" role="main" ...>`.

**11. زر User في `DesktopTopBar` بدون `aria-label` (#80)**  
فحص `DesktopTopBar.tsx` كاملاً وإضافة `aria-label` لأي زر أيقوني يفتقر إليه.

**12. `MessageThread` بلا `aria-live` على حاوية الرسائل (#86)**  
- إضافة `role="log" aria-live="polite" aria-atomic="false"` على حاوية scroll الرسائل.
- إضافة `aria-label="اكتب رسالتك"` على Input الإرسال.

**13. لا toast عند إرسال رسالة (#88) — مُحترِم قاعدة "No Toast in Data Hooks"**  
**في طبقة Page فقط** — لا نلمس `useMessaging.ts`:
- `src/hooks/application/messaging/useMessagesPage.ts:38-43` — إضافة `try/catch` يطلق `toast.success('تم إرسال الرسالة')` عند النجاح و `toast.error('تعذّر إرسال الرسالة')` عند الفشل.
- `src/hooks/page/beneficiary/messaging/useBeneficiaryMessages.ts:50` — نفس النمط للمستفيد.

**14. `ZatcaManagementPage` لا تعرض تنبيه انتهاء الشهادة (#93)**  
`src/pages/dashboard/ZatcaManagementPage.tsx` — إدراج `<ZatcaCertExpiryWarning />` (من `@/components/settings/zatca/ZatcaCertExpiryWarning`) أعلى الصفحة قبل الـTabs.

**15. جداول التقارير بلا `<caption>` دلالي (#94)**  
`AnnualDisclosureTable.tsx:65` وأي جدول مماثل في `src/components/reports/` — إضافة `<caption className="sr-only">جدول الإفصاح السنوي للوقف</caption>`.

---

## الملفات المعدَّلة (نهائية)

```
[جديد]   public/_headers
[تعديل]  .github/workflows/ci.yml
[تعديل]  src/types/navigation.ts                                         ← MenuLabels.distributions
[تعديل]  src/constants/routeRegistry.ts                                  ← labelKey
[تعديل]  src/components/dashboard/kpi/DashboardStatsGrid.tsx             ← aria-label + motion-safe
[تعديل]  src/components/dashboard/widgets/DashboardAlerts.tsx            ← aria-hidden + motion-safe
[تعديل]  src/hooks/page/admin/management/useSettingsPage.ts              ← useSearchParams (مسار صحيح)
[تعديل]  src/components/layout/DashboardLayout.tsx                       ← skip link + id main + Tab trap
[تعديل]  src/components/layout/DesktopTopBar.tsx                         ← aria-label فحص
[تعديل]  src/components/messages/MessageThread.tsx                       ← aria-live + label
[تعديل]  src/hooks/application/messaging/useMessagesPage.ts              ← toast (page layer)
[تعديل]  src/hooks/page/beneficiary/messaging/useBeneficiaryMessages.ts  ← toast (page layer)
[تعديل]  src/pages/dashboard/ZatcaManagementPage.tsx                     ← ZatcaCertExpiryWarning
[تعديل]  src/components/reports/AnnualDisclosureTable.tsx                ← caption
```

**ملاحظة حاسمة**: لن نمسّ `src/hooks/data/messaging/useMessaging.ts` — احتراماً لقاعدة الذاكرة الأساسية.

---

## ما تأكدنا أنه **خارج نطاق هذه الخطة**

- بنود `.env` و `git` (تنفيذ يدوي).
- 14 ادعاءً مُصلَحاً مسبقاً (comparison/expenseRatio/SettingsPage SelectGroup/Sidebar aria-label/mobile sidebar dialog…).
- 18 قراراً تصميمياً مقصوداً (صلاحيات المحاسب على audit/bylaws/annual-report/chart-of-accounts، BottomNav بلا messages للمحاسب، الرسائل الجماعية في الإعدادات فقط…).
- 6 ادعاءات كاذبة مُوثَّقة.
- 40 توصية UX اختيارية مؤجَّلة.

هل أعتمد هذه النسخة المصححة وأنفّذها؟