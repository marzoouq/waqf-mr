## الهدف
تعميم `AnimatedCounter` + `MiniSparkline` على داشبوردات المحاسب/المستفيد/الواقف، وإكمال موجة Hierarchy البصرية.

---

## المرحلة 1 — تعميم العدادات والمؤشرات (Wave 3 — Data Binding)

### 1.1 داشبورد المحاسب
- **`AccountantDashboardView.tsx`**: ربط `MetricCard` بـ `AnimatedCounter`.
- **`MetricCard.tsx`**: توسيع props لاستقبال `rawValue?: number`, `decimals?: number`, `prefix?: string`, `suffix?: string`, `trend?: number[]`. عرض `AnimatedCounter` للقيم الرقمية و`MiniSparkline` صغير أسفل العنوان عندما يتوفر `trend`.
- **`useAccountantDashboardData.ts`**: اشتقاق `monthlyCollectionTrend` (آخر 6 أشهر مبالغ محصّلة) لتمريره كـ `trend` لبطاقتي «إجمالي المحصّل» و«فواتير متأخرة» (مبلغ متأخر شهري).

### 1.2 داشبورد المستفيد
- **`BeneficiaryStatsRow.tsx`**: استبدال أرقام `حصتي من الريع` و`آخر توزيع` بـ `AnimatedCounter` (مع `decimals=2`, suffix `ر.س`)، واحترام `prefers-reduced-motion`.
- **بطاقة «حصتي من الريع»**: إضافة `MiniSparkline` لتاريخ التوزيعات المدفوعة الأخيرة (آخر 6 توزيعات).
- **`useBeneficiaryDashboardPage.ts`**: استخراج `myShareTrend: number[]` من `distributions` (المدفوع فقط، مرتّب زمنياً، آخر 6).

### 1.3 داشبورد الواقف
- **`WaqifOverviewStats.tsx`**: توسيع `StatItem` بـ `rawValue?: number`, `decimals?: number`, `suffix?: string`, `trend?: number[]`، وعرض `AnimatedCounter` للقيم الرقمية و`MiniSparkline` للبطاقة المالية.
- **`WaqifFinancialSection.tsx`**: استبدال أرقام KPI بـ `AnimatedCounter` (يحترم `decimals` و`suffix`).
- **`useWaqifDashboardPage.ts`**: تمرير `rawValue` لـ «عدد العقارات/العقود/المستفيدين»، و`trend` (آخر 6 أشهر دخل) لبطاقة «القابل للتوزيع» من `monthlyData`.

---

## المرحلة 2 — Hierarchy البصرية (Wave 3 — Polish)

### 2.1 توحيد أحجام العناوين
- إضافة tokens في `tailwind.config.ts` لـ Display sizes: `display-xs`, `display-sm`, `display-md` (clamp() responsive)، بحيث يصبح H1 الصفحات الرئيسية موحّداً بـ `display-md` و subtitle بـ `text-muted-foreground text-sm`.
- تطبيق على رؤوس الداشبوردات الثلاث + `AdminDashboard` (`WaqifWelcomeCard`, `BeneficiaryWelcomeCard`, header الناظر).

### 2.2 التباعد
- توحيد `space-y` للمستوى الأعلى على `space-y-6 sm:space-y-8` (حالياً 4-6 متذبذب).
- توحيد `gap` للشبكات على `gap-3 sm:gap-4 lg:gap-5`.

### 2.3 تسلسل البطاقات
- تطبيق `card-elevated` (موجود ضمن tokens) على بطاقات KPI الرئيسية فقط (الصف الأول)، بينما تبقى البطاقات الثانوية بـ `shadow-sm` — يخلق تسلسلاً بصرياً واضحاً.
- توحيد border-radius البطاقات على `rounded-xl` للبطاقات الكبيرة و`rounded-lg` للصغيرة.

### 2.4 رؤوس البطاقات (CardHeader)
- توحيد: `CardTitle` بـ `text-base sm:text-lg font-semibold`، أيقونة `w-4 h-4 text-muted-foreground`، `pb-2` بدلاً من `pb-3`.

---

## ملاحظات تقنية

- لا تغييرات على Edge Functions / DB / RLS / Auth.
- لا تعديل على ملفات Supabase التلقائية.
- احترام `prefers-reduced-motion` بالكامل (مدمج في `AnimatedCounter`).
- اختبارات: تحديث snapshots/unit tests للمكونات الثلاثة فقط عند الحاجة. الهدف: 100% pass.

---

## معايير القبول
1. الأرقام في البطاقات الرئيسية تعدّ تصاعدياً عند التحميل في الأدوار الأربعة.
2. `MiniSparkline` يظهر على بطاقتين على الأقل لكل دور.
3. أحجام العناوين متّسقة بين الداشبوردات.
4. لا regression بصرية على الجوال (320px+).
5. TSC نظيف + جميع الاختبارات تمر.