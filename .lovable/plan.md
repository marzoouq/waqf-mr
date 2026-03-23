# حالة المشروع — نظام إدارة وقف مرزوق بن علي الثبيتي

## الإصلاحات المنجزة

### ✅ تصحيح منطق الإيرادات التعاقدية
- إزالة fallback `?? rent_amount` → `?? 0` في AdminDashboard, ContractsPage, WaqifDashboard
- الإيرادات التعاقدية تعتمد على `allocated_amount` من `contract_fiscal_allocations`

### ✅ توحيد فلترة العقود
- `isSpecificYear` → جميع العقود (active + expired)
- `all` → فقط `active`
- مطبّق في: AdminDashboard, PropertiesPage, ContractsPage, WaqifDashboard

### ✅ جدول الاستحقاقات الشهري
- يعتمد على `payment_invoices` الفعلية بدلاً من `rent/12`
- أشهر ديناميكية حسب حدود السنة المالية
- تلوين حسب حالة الفاتورة (مسدد/معلق/متأخر)

### ✅ استخراج `usePropertyFinancials` hook
- منطق حسابي موحد بين PropertiesPage و PropertiesViewPage

### ✅ إنشاء `dashboardComputations.ts`
- `computeMonthlyData`, `computeCollectionSummary`, `computeOccupancy`
- مستخدم في AdminDashboard و WaqifDashboard

### ✅ إزالة تبويب "مقارنة سنوية" المكرر من التقارير

### ✅ إصلاح PDF الوحدات
- `rent_amount` يُعامل كسنوي (الشهري = rent/12)

### ✅ توثيق BUSINESS_RULES.md
- 16 قسم يغطي جميع القواعد المالية والتقنية

---

## القواعد السارية

مرجع كامل في `BUSINESS_RULES.md` — الأقسام 9-16 هي الأهم:
- §9: الإيرادات = الدخل الفعلي المحصّل فقط
- §10: السنة المالية هي المرجع وليس الميلادية
- §11: أمثلة حالات حافة (5 سيناريوهات)
- §12: فلترة موحدة بـ `isSpecificYear`
- §16: قواعد البطاقات لمنع التكرار
