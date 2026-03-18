

## الفحص الجنائي — الجولة 14 (لوحة المستفيد: 21 بنداً)

### التحقق بند بند مقابل الكود الفعلي

| # | البند | الحقيقة بعد الفحص | إصلاح؟ |
|---|-------|-------------------|--------|
| **BEN-01** | admin يرى واجهة مستفيد | **🟡 بالتصميم** — App.tsx سطر 172: `allowedRoles={['admin', 'beneficiary']}`. هذا **مقصود** — الأدمين يصل لـ `/beneficiary` من sidebar "واجهة المستفيد" ليرى ما يراه المستفيد. إضافة redirect تُعطّل هذه الميزة. **لكن** النص "مستفيد" عند غياب `currentBeneficiary` للأدمين = مضلل | **نعم** (النص فقط) |
| **BEN-02** | `notifLoading` يحجب العرض | **✅ مؤكد** — سطر 45: `notifLoading` ضمن `isLoading`. الإشعارات غير حرجة لكنها تحجب الداشبورد كلها | **نعم** |
| **BEN-03** | ترتيب Guards خاطئ | **✅ مؤكد جزئياً** — سطر 153 `noPublishedYears` قبل سطر 177 `!currentBeneficiary`. **لكن**: إذا كان `noPublishedYears=true` و`currentBeneficiary=null` → يعرض "مستفيد" + NoPublishedYearsNotice بدلاً من "حسابك غير مرتبط". السيناريو حقيقي | **نعم** |
| **BEN-04** | `toLocaleString()` بدون locale | **✅ مؤكد** — Dashboard سطر 239, 260, 341. MySharePage سطور 361, 375, 389, 404, 436, 482, 514, 543, 584, 616, 649 | **نعم** |
| **BEN-05** | limit(3) يحجب آخر توزيع paid | **🟡 مقبول** — سطر 92: `limit(3)` بعد ترتيب تنازلي. البطاقة تعرض "آخر توزيع مستلم" = أحدث 3. إذا كانت الـ 3 الأخيرة pending = يعرض "لا توجد" وهذا **صحيح وظيفياً** — لا يوجد توزيع مدفوع حديث. تكلفة استعلام إضافي لا تبررها الفائدة | لا |
| **BEN-06** | غياب Realtime في MySharePage | **🟡 مقبول** — MySharePage تستخدم `staleTime` من React Query. التحديث التلقائي عبر refetchOnWindowFocus كافٍ. إضافة Realtime لكل صفحة = ضغط على DB | لا (DEFER) |
| **BEN-07** | `invalidateQueries()` بلا قيد | **✅ مؤكد** — سطر 23: بدون queryKey. MySharePage سطر 28-31 محدد بشكل صحيح | **نعم** |
| **BEN-08** | quickLinks ناقصة للواقف | **❌ مدحوض** — الواقف لا يصل لـ BeneficiaryDashboard. مسار الواقف = `/waqif` → `WaqifDashboard`. `allowedRoles` في سطر 173: `['admin', 'beneficiary']` فقط — لا `waqif` | لا |
| **BEN-09** | ArrowLeft في RTL | **🟡 مقبول بالتصميم** — في RTL `ArrowLeft` يشير للأمام (يسار = اتجاه القراءة). هذا هو السلوك القياسي في تصاميم RTL. `ChevronLeft` يُستخدم عادةً لنفس الغرض | لا |
| **BEN-10** | myShare يُحسب بطريقتين | **❌ مدحوض** — كلا الصفحتين يستخدمان `useMyShare` مع `useFinancialSummary`. نفس الـ hooks = نفس الـ cache = نفس القيم. الفارق الوحيد: Dashboard يمرر `benError ? [] : beneficiaries` كـ fallback = أكثر أماناً | لا |
| **BEN-11** | أزرار PDF بدون disabled | **✅ مؤكد** — سطر 334-346: 4 أزرار بدون loading state أو disabled | **نعم** |
| **BEN-12** | 4 طرق لتنزيل PDF | **🟡 بالتصميم** — كل PDF مختلف المحتوى (ملخص الحصة vs تقرير التوزيع vs تقرير شامل vs طباعة). 4 مخرجات مختلفة = 4 أزرار | لا |
| **BEN-13** | غياب بطاقة نسبة الحصة | **✅ مؤكد** — لا تُعرض في البطاقات العلوية رغم وجودها في PDF | **نعم** |
| **BEN-14** | myShare يُعرض قبل الإقفال | **✅ مؤكد جزئياً** — سطر 361 يعرض myShare دائماً. **لكن** سطر 413-425 يعرض تنبيه "السنة لم تُغلق بعد" عند `myShare === 0`. المشكلة: إذا `myShare > 0` في سنة نشطة (رقم وسيط) → يُعرض بدون تنبيه | **نعم** |
| **BEN-15** | Badge "جديد" لون خاطئ | **✅ مؤكد** — سطر 376: `variant="default"` بينما عدد الإشعارات سطر 361: `variant="destructive"`. تناقض بصري | **نعم** |
| **BEN-16** | distributions بلا فلتر FY في Dashboard | **🟡 بالتصميم** — Dashboard يعرض "آخر التوزيعات" عبر جميع السنوات = مقصود كملخص عام. MySharePage تُصفّي بالسنة المحددة = مقصود كتفصيل | لا |
| **BEN-17** | isAccountMissing مضلل في السنوات النشطة | **✅ مؤكد** — سطر 296: يُعرض حتى في السنوات النشطة بدون حساب ختامي. لكن سطر 413 يعالج الحالة جزئياً. **ومع ذلك** إذا `isAccountMissing=true` يُحجب كل شيء قبل الوصول لسطر 413 | **نعم** |
| **BEN-18** | hover class مُولَّد خاطئ | **✅ مؤكد** — سطر 245: `` `${s.cls} hover:${s.cls}` `` → `hover:bg-warning/20 text-warning` = كلاس واحد خاطئ. **لكن**: Tailwind يتجاهل الكلاسات غير المعروفة ويطبق `s.cls` الأصلي فقط. الـ hover لا يعمل لكن لا crash. التأثير بصري فقط | **نعم** (بسيط) |
| **BEN-19** | مفقود notifications في PERM_KEYS | **❌ مدحوض** — constants.ts سطر 110: `'/beneficiary/notifications': 'notifications'` **موجود** بالفعل في `BENEFICIARY_ROUTE_PERM_KEYS` | لا |
| **BEN-20** | تناقض حجم البطاقات | **🟡 تجميلي** — الصفحتان لهما سياقات مختلفة (Dashboard ملخص مكثف vs MySharePage تفصيلية). التناقض مقبول | لا |
| **BEN-21** | تناقض رسالة الفراغ | **🟡 تجميلي** — Dashboard رسالة مختصرة، MySharePage رسالة مفصلة مع أيقونة. مقبول بالسياق | لا |

---

### الإصلاحات المطلوبة — 10 تغييرات في 3 ملفات

#### الملف 1: `src/pages/beneficiary/BeneficiaryDashboard.tsx`

1. **BEN-01** (سطر 165, 210, 212): تحسين النص للأدمين:
```tsx
{currentBeneficiary?.name || (role === 'admin' ? 'الناظر' : role === 'waqif' ? 'الواقف' : 'مستفيد')}
```
وتغيير "واجهة المستفيد" → عرض حسب الدور.

2. **BEN-02** (سطر 45): إزالة `notifLoading` من `isLoading`.

3. **BEN-03** (سطر 153-193): نقل guard `!currentBeneficiary` **قبل** `noPublishedYears`.

4. **BEN-04** (سطور 239, 260, 341): إضافة `'ar-SA'` لكل `toLocaleString()`.

5. **BEN-07** (سطر 23): تحديد queryKeys:
```tsx
const handleRetry = useCallback(() => {
  queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
  queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
  queryClient.invalidateQueries({ queryKey: ['my-distributions-recent'] });
}, [queryClient]);
```

6. **BEN-15** (سطر 376): تغيير `variant="default"` → `variant="secondary"` لـ badge "جديد".

#### الملف 2: `src/pages/beneficiary/MySharePage.tsx`

7. **BEN-04** (سطور 361, 375, 389, 404, 436, 482, 514, 543, 584, 616, 649): إضافة `'ar-SA'` لكل `toLocaleString()`.

8. **BEN-11** (سطور 334-346): إضافة `isPdfLoading` state لتعطيل أزرار PDF أثناء التوليد.

9. **BEN-13** (بعد سطر 352): إضافة بطاقة "نسبة الحصة %" مع `currentBeneficiary.share_percentage`.

10. **BEN-14** (سطر 361): تطبيق نفس منطق Dashboard — عرض "تُحسب عند الإقفال" إذا `selectedFY?.status !== 'closed'`.

11. **BEN-17** (سطر 296): إضافة شرط `selectedFY?.status === 'closed'`:
```tsx
if (isAccountMissing && selectedFY?.status === 'closed') { ... }
```

12. **BEN-18** (سطر 245): إصلاح hover class:
```tsx
return <Badge className={s.cls}><Icon ... />{s.label}</Badge>;
```
(حذف `hover:${s.cls}` الخاطئ — hover على Badge غير ضروري أصلاً)

#### الملف 3: `src/components/dashboard-layout/constants.ts`
لا تغييرات مطلوبة — BEN-19 مدحوض.

---

### بنود مدحوضة بارزة

| # | الادعاء | الحقيقة |
|---|---------|---------|
| **BEN-08** | quickLinks ناقصة للواقف | الواقف لا يصل لـ BeneficiaryDashboard — مساره `/waqif` |
| **BEN-10** | myShare يُحسب بطريقتين | كلاهما يستخدم نفس الـ hooks = نفس القيم |
| **BEN-19** | notifications مفقود في PERM_KEYS | موجود في سطر 110 |

### ملخص التأثير

- **ملفان** يُعدَّلان (BeneficiaryDashboard + MySharePage)
- من أصل 21 بنداً: **10 للإصلاح** (في 12 تغييراً)، **0 مؤجلة**، **11 مدحوضة/مقبولة/تجميلية**

