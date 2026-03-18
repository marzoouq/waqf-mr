

## تقرير الفحص النهائي — النتائج والإصلاحات المقترحة

### المشكلة 1: `advance_settings` — هل يُقرأ في صفحة السُلف؟
**النتيجة: ✅ لا توجد مشكلة — التطبيق مكتمل 100%**

الإعداد يُقرأ ديناميكياً في 3 مواقع:
- `BeneficiaryDashboard.tsx` — يتحكم بإظهار/إخفاء قسم السُلف
- `MySharePage.tsx` — يتحكم بزر طلب سلفة
- `AdvanceRequestsTab.tsx` — يعرض الحدود للناظر

لا يحتاج أي إصلاح.

---

### المشكلة 2: `queryKey: ['waqf-info']` — كود ميت
**النتيجة: ⚠️ مشكلة حقيقية — كود هدر في 5 مواقع**

`useWaqfInfo()` يعتمد على `useAppSettings()` الذي يستخدم queryKey = `['app-settings-all']`.
لا يوجد أي useQuery بمفتاح `['waqf-info']` في المشروع بأكمله.

كل استدعاءات `invalidateQueries({ queryKey: ['waqf-info'] })` هي كود ميت لا تُبطل شيئاً:
1. `SettingsPage.tsx` — 3 مواقع (سطور 85, 111, 265)
2. `ZatcaSettingsTab.tsx` — موقع واحد (سطر 246)
3. `WaqfInfoBar.tsx` — موقع واحد (سطر 121)

**الإصلاح:** حذف جميع أسطر `invalidateQueries({ queryKey: ['waqf-info'] })` من الملفات الخمسة، حيث أن `['app-settings-all']` يُبطَل بالفعل في كل هذه المواقع (أو يُبطَل تلقائياً عبر `updateSetting` في useAppSettings).

- في `WaqfInfoBar.tsx` خصوصاً: يجب إضافة `invalidateQueries({ queryKey: ['app-settings-all'] })` بدلاً منه، لأنه المكان الوحيد الذي لا يُبطل المفتاح الصحيح.

---

### المشكلة 3: `BannerSettingsTab` — Race Condition
**النتيجة: ⚠️ خفيف لكن قابل للإصلاح**

السيناريو: المستخدم يكتب نصاً → يضغط Switch قبل أن يغادر حقل النص (onBlur) → `save({ enabled: v })` يُرسل النص القديم من `form` الحالي.

لكن بالنظر للكود الفعلي (سطر 21-24):
```typescript
const save = (patch: Partial<BannerSettings>) => {
  const updated = { ...form, ...patch };  // form يحتوي النص الجديد لأن onChange حدّثه
  setForm(updated);
  updateJsonSetting("beta_banner_settings", updated);
};
```

**النتيجة المحدثة:** `form` يتحدث عبر `onChange` فوراً، لذا `save({ enabled: v })` سيأخذ النص الأحدث من `form`. المشكلة الوحيدة المحتملة هي batching في React 18 لكنها نادرة جداً.

**الإصلاح الاحتياطي البسيط:** استخدام `useRef` للنص بدلاً من الاعتماد على state فقط، أو تحويل حقل النص لزر حفظ يدوي. لكن الأولوية منخفضة.

---

### ملخص الإصلاحات المطلوبة

| # | الإصلاح | الملفات | الأولوية |
|---|---|---|---|
| 1 | حذف `invalidateQueries(['waqf-info'])` من 4 ملفات | SettingsPage, ZatcaSettingsTab, WaqfInfoBar | منخفضة |
| 2 | إضافة `invalidateQueries(['app-settings-all'])` في WaqfInfoBar | WaqfInfoBar.tsx سطر 121 | متوسطة |
| 3 | (اختياري) إصلاح race condition في BannerSettingsTab | BannerSettingsTab.tsx | منخفضة جداً |

### التغييرات التقنية

**الملف 1: `src/components/WaqfInfoBar.tsx`** سطر 121
- استبدال `['waqf-info']` بـ `['app-settings-all']`

**الملف 2: `src/pages/dashboard/SettingsPage.tsx`** سطور 85, 111, 265
- حذف 3 أسطر `queryClient.invalidateQueries({ queryKey: ['waqf-info'] })`

**الملف 3: `src/components/settings/ZatcaSettingsTab.tsx`** سطر 246
- حذف سطر `queryClient.invalidateQueries({ queryKey: ['waqf-info'] })`

المجموع: حذف 4 أسطر كود ميت + تصحيح مفتاح واحد.

