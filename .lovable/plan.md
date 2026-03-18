

# خطة التحسينات — المرحلة التالية

## ما تم إصلاحه سابقاً (لا حاجة لإعادته)

| البند | الحالة |
|-------|--------|
| ازدواجية ثوابت `DEFAULT_ADMIN_SECTIONS` | ✅ تم — يستورد من `constants.ts` |
| إجراءات سريعة للناظر | ✅ تم — Quick Actions يظهر لـ admin + accountant |
| ترحيب شخصي باسم الناظر | ✅ تم — يستخدم `user_metadata.full_name` |
| فصل الدفع الجزئي عن المتأخر | ✅ تم — `CollectionSummaryChart` بثلاث شرائح |
| إزالة emoji من KPI | ✅ تم |
| توحيد EXPIRING_SOON_DAYS | ✅ تم — 90 يوم موحد |

## المتبقي القابل للتنفيذ (4 مهام)

### 1. تقسيم `AdminDashboard.tsx` إلى مكونات فرعية
الملف 632 سطر. رغم استخدام lazy loading للرسوم البيانية، إلا أن المنطق الحسابي (stats + KPIs + collectionSummary + monthlyData + expenseTypes) كله في مكون واحد.

**التقسيم المقترح:**
- `src/components/dashboard/DashboardStatsGrid.tsx` — بطاقات الإحصائيات الـ 11 (سطور 314-337)
- `src/components/dashboard/DashboardKpiPanel.tsx` — مؤشرات الأداء (سطور 340-365)
- `src/components/dashboard/CollectionSummaryCard.tsx` — ملخص التحصيل (سطور 446-508)
- `src/components/dashboard/RecentContractsCard.tsx` — آخر العقود (سطور 567-626)
- `src/components/dashboard/DashboardAlerts.tsx` — تنبيهات (سطور 267-312)

AdminDashboard يبقى كـ orchestrator يجلب البيانات ويمررها كـ props.

### 2. إضافة بطاقتي KPI مفقودتين
- **التدفق النقدي الصافي**: `netAfterExpenses - adminShare - waqifShare - zakatAmount` = المبلغ الفعلي المتبقي بعد كل الاستقطاعات
- **نسبة التوزيع الفعلي**: `(إجمالي التوزيعات المدفوعة / المتاح للتوزيع) × 100`

تُضاف في `stats` array (سطر 149) كبطاقتين إضافيتين.

### 3. إبراز طلب السُلفة في لوحة المستفيد
- إضافة بطاقة "طلب سلفة" واضحة في `BeneficiaryDashboard.tsx` بعد بطاقات الإحصائيات
- تظهر فقط إذا كان `advance_enabled` في الإعدادات
- زر يفتح `AdvanceRequestDialog` مباشرة

### 4. تصنيف تبويبات الإعدادات
- تجميع 16 تبويب في 4 فئات:
  - **الهوية**: بيانات الوقف، الواجهة، المظهر، شريط التنبيه
  - **المالية**: السنة المالية، السُلف، الضريبة (ZATCA)
  - **المستخدمون**: صلاحيات الأدوار، الأقسام، القائمة، المستفيد
  - **النظام**: الإشعارات، رسائل جماعية، تصدير، البصمة، الأمان

## ملخص الملفات

| الملف | التغيير |
|-------|---------|
| `AdminDashboard.tsx` | تقسيم إلى مكونات + بطاقتي KPI |
| `DashboardStatsGrid.tsx` | **جديد** — بطاقات الإحصائيات |
| `DashboardKpiPanel.tsx` | **جديد** — مؤشرات الأداء |
| `CollectionSummaryCard.tsx` | **جديد** — ملخص التحصيل |
| `RecentContractsCard.tsx` | **جديد** — آخر العقود |
| `DashboardAlerts.tsx` | **جديد** — التنبيهات |
| `BeneficiaryDashboard.tsx` | إضافة بطاقة طلب السُلفة |
| `SettingsPage.tsx` | تصنيف التبويبات في فئات |

**إجمالي:** 8 ملفات (5 جديدة + 3 معدّلة)

