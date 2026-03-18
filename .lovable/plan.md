

## الفحص الجنائي — الجولة الثامنة (تقرير المكوّنات البصرية: 32 بنداً)

### التحقق بند بند مقابل الكود الفعلي

---

| # | البند | الحقيقة بعد الفحص | إصلاح؟ |
|---|-------|-------------------|--------|
| **CS-01** | Donut فارغ عند 0+0 | **✅ مؤكد** — لا يوجد guard. Recharts يرسم دائرة فارغة شفافة | **نعم** |
| **CS-02** | لا نص مركزي في الثقب | **🟡 تحسين بصري** — ليس خطأ وظيفياً | لا (DEFER-20) |
| **CS-03** | "منتظم" يشمل المدفوع جزئياً | **❌ تم إصلاحه** — الجولة 7 غيّرت التسمية إلى "محصّل". التقسيم لـ 3 شرائح = تغيير تصميمي | لا (DEFER-21) |
| **CS-04** | حجم 180px على 320px | **🟡 حالة حدية** — 320px نادر جداً. `shrink-0` يحمي الحاوية | لا |
| **CS-05** | Tooltip بلا name | **✅ مؤكد** — `formatter` يُعيد `[value, undefined]` → عنوان فارغ | **نعم** (بسيط) |
| **H-01** | Heatmap تخلط سنوات | **✅ مؤكد وحرج** — `new Date(dateStr).getMonth()` بدون فلتر سنة. فواتير 2024+2025 تتجمع في نفس الشهر | **نعم** |
| **H-02** | `1500 → "2k"` تقريب خاطئ | **✅ مؤكد** — `toFixed(0)` يقرّب 1.5→2. الحل: `toFixed(1).replace(/\.0$/, '')` | **نعم** |
| **H-03** | Grid 4 أعمدة على 320px | **🟡 حالة حدية** — 320px = أصغر iPhone SE. التصميم الحالي مقبول عند 375px+ | لا |
| **H-04** | الشهر الحالي غير مميّز | **🟡 تحسين بصري جيد** | **نعم** (بسيط) |
| **H-05** | مفتاح التدرج بلا أرقام | **🟡 تحسين** — "أقل/أكثر" كافٍ للسياق | لا |
| **H-06** | `key={i}` غير فريد عالمياً | **✅ مؤكد** — لكن في مكوّنات مختلفة (Pie vs Legend)، React يعزلها. **خطر نظري فقط** | **نعم** (بسيط) |
| **H-07** | لا aria-label | **🟡 تحسين وصولية** | لا (DEFER-22) |
| **FY-01** | text-destructive UNREACHABLE | **❌ تم إصلاحه في الجولة 7** — سطر 52 الحالي: `remainingDays <= 7 ? 'text-destructive' : remainingDays <= 30 ? 'text-warning'` ✅ | لا |
| **FY-02** | warning في بداية السنة | **🟡 مقبول** — التحذير الأصفر في البداية منطقي (التحصيل فعلاً 0%). Grace period = تعقيد بلا قيمة واضحة | لا |
| **FY-03** | يختفي للسنوات المغلقة | **❌ بالتصميم** — موثق في plan.md (BUG-C). الويدجت لمتابعة السنة النشطة فقط | لا |
| **FY-04** | لا يعرض تاريخ الانتهاء | **🟡 تحسين بسيط مفيد** | **نعم** |
| **FY-05** | Math.ceil يضيف يوماً مبكراً | **❌ مقبول** — الفرق ≤ 1 يوم. `ceil` يضمن عدم عرض "0 يوم متبقي" قبل انتهاء اليوم فعلياً | لا |
| **DC-01** | IncomeMonthlyChart ميت | **✅ مؤكد** — مكوّن كامل (96 سطر) موجود لكن غير مُستورد. لكن استبداله بـ DashboardCharts = تغيير UX كبير (يُزيل رسم المصروفات الدائري) | لا (DEFER-23) |
| **DC-02** | YAxis بلا formatter | **✅ مؤكد** — أرقام خام ضخمة بلا تنسيق | **نعم** |
| **DC-03** | Legend + label% تكرار | **🟡 تجميلي** — كلاهما يقدم معلومة مختلفة (الاسم vs النسبة) | لا |
| **DC-04** | CartesianGrid بلا opacity | **🟡 تجميلي بحت** | لا |
| **DC-05** | ChartSkeleton `md:` ≠ DashboardCharts `lg:` | **✅ مؤكد** — سطر 40: `md:grid-cols-2` vs DashboardCharts: `lg:grid-cols-2`. Layout shift على 768-1023px | **نعم** |
| **YOY-01** | `— 0%` عند changePercent=0 | **✅ مؤكد جزئياً** — يعرض `Minus icon + 0%`. الأفضل إخفاء الرقم عند 0 | **نعم** (بسيط) |
| **YOY-02** | لا tooltip للمقارنة | **🟡 تحسين** | لا (DEFER-24) |
| **YOY-03** | TrendingUp أحمر مربك | **❌ بالتصميم** — اللون (أحمر) يوضح السلبية. الأيقونة (↑) توضح الاتجاه. مزيجهما = "ارتفعت سلبياً". واضح بما فيه الكفاية | لا |
| **PA-01** | ZATCA بلا fiscal year filter | **🟡 مؤجل** — يتطلب إضافة `fiscal_year_id` لجدول `payment_invoices` أو ربطها عبر العقود. تغيير معقد | لا (DEFER-25) |
| **PA-02** | "بدون سبب" كنص | **✅ مؤكد** — الأفضل `'—'` بدل "بدون سبب" | **نعم** (بسيط) |
| **PA-03** | رابط ZATCA → `/contracts` بدل `/zatca` | **✅ مؤكد** — سطر 62 + سطر 121. يوجد `ZatcaManagementPage` على `/dashboard/zatca` | **نعم** |
| **PA-04** | key={i} بدون id | **❌ تم إصلاحه في الجولة 7** — سطر 96: `key={`${action.type}-${i}`}` ✅ | لا |
| **SK-01** | count=9 ≠ 11 | **✅ مؤكد** — `StatsGridSkeleton` default=9 لكن stats.length=11 | **نعم** |
| **SK-02** | KpiSkeleton grid مختلف | **✅ مؤكد** — Skeleton: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`. الحقيقي: `grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6`. Layout shift واضح | **نعم** |
| **PH-01** | وصف الهيدر لا ينبّه عند 'all' | **✅ مؤكد** — `fiscalYearId='all'` → `fiscalYear=null` → لا يُعرض أي سياق زمني | **نعم** |
| **PH-02** | طباعة بلا CSS خاص | **🟡 مؤجل** — يتطلب `@media print` مخصص. تغيير واسع | لا (DEFER-26) |

---

### الإصلاحات المطلوبة — 14 تغييراً في 6 ملفات

#### الملف 1: `src/components/dashboard/CollectionHeatmap.tsx`

**H-01 (حرج): إضافة فلتر سنة للشهور**
```typescript
// تغيير السطر ~53: إضافة فلتر بالسنة من paid_date
const dateObj = new Date(dateStr);
const month = dateObj.getMonth();
// تجاهل الفواتير من سنوات لا تطابق أي فاتورة أخرى — 
// الحل: تخزين year+month معاً واستخدام Map<string, number>
```
استبدال `amounts[month]` بـ Map مفتاحها `"YYYY-MM"` ثم عرض الأشهر الـ12 الأخيرة فقط (أو أشهر السنة المالية المُمررة).

**H-02: تنسيق k بدقة**
```typescript
amount >= 1000 
  ? `${(amount / 1000).toFixed(1).replace(/\.0$/, '')}k` 
  : amount.toLocaleString('ar-SA')
```

**H-04: تمييز الشهر الحالي**
إضافة `ring-2 ring-primary` للشهر الحالي.

**H-06: مفاتيح فريدة**
`key={`month-${i}`}` و `key={`legend-${i}`}`

#### الملف 2: `src/components/dashboard/CollectionSummaryChart.tsx`

**CS-01: guard للبيانات الفارغة**
```typescript
if (onTime === 0 && late === 0) {
  return <div className="w-[180px] h-[180px] ...">لا توجد بيانات</div>;
}
```

**CS-05: إصلاح Tooltip formatter**
```typescript
formatter={(value, name) => [`${value} فاتورة`, name]}
```

#### الملف 3: `src/components/dashboard/DashboardCharts.tsx`

**DC-02: YAxis formatter**
```typescript
<YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
```

#### الملف 4: `src/components/dashboard/YoYBadge.tsx`

**YOY-01: إخفاء 0% عند التعادل**
```typescript
{isNeutral ? null : <>{Math.abs(changePercent)}%</>}
```

#### الملف 5: `src/components/dashboard/PendingActionsTable.tsx`

**PA-02: تحسين نص "بدون سبب"**
```typescript
detail: r.reason || '—',
```

**PA-03: إصلاح رابط ZATCA** (سطر 62 + سطر 121)
```typescript
link: '/dashboard/zatca',  // بدل '/dashboard/contracts'
```

#### الملف 6: `src/components/dashboard/FiscalYearWidget.tsx`

**FY-04: عرض تاريخ انتهاء السنة**
إضافة سطر تحت "من أصل X يوم":
```typescript
<p className="text-[10px] text-muted-foreground">
  تنتهي في: {new Date(fiscalYear.end_date).toLocaleDateString('ar-SA', { day:'numeric', month:'long', year:'numeric' })}
</p>
```

#### الملف 7: `src/pages/dashboard/AdminDashboard.tsx`

**SK-01: تمرير count=11 للـ StatsGridSkeleton** (سطر 300)
```typescript
<StatsGridSkeleton count={11} />
```

**DC-05: توحيد breakpoint ChartSkeleton** (سطر 40)
```typescript
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">  // بدل md + gap-4
```

**PH-01: وصف الهيدر عند 'all'** (سطر 241-242)
```typescript
(fiscalYearId === 'all' ? ' — عرض إجمالي جميع السنوات' : fiscalYear ? ` — ${fiscalYear.label}` : '')
```

#### الملف 8: `src/components/SkeletonLoaders.tsx`

**SK-02: توحيد KpiSkeleton grid** (سطر 57)
```typescript
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
```

---

### بنود مؤجلة جديدة

| # | البند | الوصف | الأولوية |
|---|-------|-------|---------|
| DEFER-20 | CS-02 | نص مركزي داخل ثقب الـ Donut | منخفضة |
| DEFER-21 | CS-03 | تقسيم Donut لـ 3 شرائح (مدفوع/جزئي/متأخر) | متوسطة |
| DEFER-22 | H-07 | إضافة aria-label لخلايا الخريطة الحرارية | منخفضة |
| DEFER-23 | DC-01 | تفعيل IncomeMonthlyChart بدل DashboardCharts أو بجانبه | متوسطة |
| DEFER-24 | YOY-02 | إضافة tooltip "مقارنة بالسنة السابقة" للشارة | منخفضة |
| DEFER-25 | PA-01 | فلترة فواتير ZATCA بالسنة المالية | متوسطة |
| DEFER-26 | PH-02 | إضافة @media print CSS للوحة الإدارية | منخفضة |

---

### ملخص التأثير

- **8 ملفات** تُعدَّل
- لا تغييرات في قاعدة البيانات
- **7 بنود جديدة** للتأجيل (DEFER-20 إلى DEFER-26)
- من أصل 32 بنداً: **14 مؤكدة للإصلاح**, **7 مؤجلة**, **11 مدحوضة/بالتصميم/سبق إصلاحها**
- أخطرها: **H-01** (الخريطة الحرارية تخلط بيانات سنوات مختلفة)

