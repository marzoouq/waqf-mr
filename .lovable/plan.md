
# خطة إصلاح شاملة: حجب النسبة + تطوير نظام الألوان الاحترافي

## المشاكل المكتشفة

### 1. نسبة الحصة لا تزال ظاهرة في 3 أماكن
- **AccountsViewPage.tsx** سطر 165: `حصتي المستحقة ({currentBeneficiary.share_percentage}%)`
- **FinancialReportsPage.tsx** سطر 104: النسبة تظهر في PDF المصدّر
- **MySharePage.tsx** سطر 85: النسبة تظهر في PDF المصدّر

### 2. نظام الألوان قاصر وغير شامل
المشكلة الجوهرية: `applyTheme` يغير فقط 10 متغيرات CSS لكن التطبيق يحتوي على:
- تدرجات لونية مكتوبة بقيم ثابتة (hardcoded HSL) في `index.css`:
  - `.gradient-primary` - تدرج أخضر ثابت
  - `.gradient-hero` - تدرج أخضر ثابت
  - `.gradient-auth` - تدرج أخضر ثابت
  - `.shadow-elegant` - ظل أخضر ثابت
  - `.shadow-card-hover` - ظل أخضر ثابت
  - `.glass-dark` - خلفية زجاجية بلون ثابت
- متغيرات الوضع الداكن لا تتغير اطلاقا عند تبديل القالب
- متغيرات مفقودة: `--chart-1` إلى `--chart-5`، `--muted`، `--border` لا تتكيف
- الرسوم البيانية (Recharts) تستخدم ألوان ثابتة مثل `#22c55e`

---

## خطة التنفيذ

### المرحلة 1: حجب النسبة بالكامل من جميع واجهات المستفيدين

**تعديل `src/pages/beneficiary/AccountsViewPage.tsx`:**
- سطر 165: تغيير `حصتي المستحقة ({currentBeneficiary.share_percentage}%)` إلى `حصتي المستحقة`

**تعديل `src/pages/beneficiary/FinancialReportsPage.tsx`:**
- سطر 104: إزالة `percentage` من بيانات PDF أو استبدالها بقيمة مخفية

**تعديل `src/pages/beneficiary/MySharePage.tsx`:**
- سطر 85: إزالة `sharePercentage` من بيانات PDF أو تمريرها كـ 0

### المرحلة 2: تطوير نظام الألوان ليكون احترافياً وشاملاً

**تعديل `src/components/ThemeColorPicker.tsx` - توسيع `applyTheme` ليشمل:**

المتغيرات الاضافية التي يجب تغييرها:
- `--primary-foreground` - للتأكد من وضوح النص
- `--chart-1` إلى `--chart-5` - ألوان الرسوم البيانية
- `--border` و `--input` - حدود العناصر
- `--muted` و `--muted-foreground` - الألوان الباهتة
- `--card` - خلفية البطاقات (تعديل طفيف)
- `--success` - لون النجاح المتوافق مع القالب

كل قالب لون سيحتوي على مجموعة كاملة من القيم لكل هذه المتغيرات.

**تفعيل الوضع الداكن:**
- استخدام `MutationObserver` لمراقبة تغيير class `dark` على العنصر `html`
- عند التبديل: تطبيق القيم الداكنة المناسبة (`darkPrimary`, `darkSecondary`, إلخ)

**تعديل `src/index.css` - تحويل التدرجات من قيم ثابتة إلى متغيرات CSS:**

```css
/* قبل - ثابت */
.gradient-primary {
  background: linear-gradient(135deg, hsl(158 64% 25%) ...);
}

/* بعد - ديناميكي */
.gradient-primary {
  background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 50%, hsl(var(--primary) / 0.9) 100%);
}
```

القوائم المتأثرة:
- `.gradient-primary` - سيستخدم `var(--primary)`
- `.gradient-hero` - سيستخدم `var(--primary)` مع تدرجات
- `.gradient-auth` - سيستخدم `var(--primary)` و `var(--secondary)`
- `.shadow-elegant` - سيستخدم `var(--primary)`
- `.shadow-card-hover` - سيستخدم `var(--primary)`
- `.glass-dark` - سيستخدم `var(--primary)`
- `.text-gradient` و `.text-gradient-gold` - تبقى ذهبية (ثابتة لأنها زخرفية)
- `.animate-glow` - سيستخدم `var(--secondary)`

### المرحلة 3: تأكيد تقييد الحقول في الإعدادات

**تأكيد `src/pages/beneficiary/BeneficiarySettingsPage.tsx`:**
- الحقول (الاسم، رقم الهوية) بالفعل `readOnly` مع `bg-muted/50` -- مؤكد وسليم
- حقل النسبة تم إزالته بالفعل -- مؤكد
- إضافة `disabled` بجانب `readOnly` كطبقة حماية إضافية
- إضافة أيقونة قفل بجانب كل حقل لتوضيح أنه غير قابل للتعديل

---

## الملفات المتأثرة (5 ملفات):

1. **`src/pages/beneficiary/AccountsViewPage.tsx`** - إزالة عرض النسبة
2. **`src/pages/beneficiary/FinancialReportsPage.tsx`** - إخفاء النسبة من PDF
3. **`src/pages/beneficiary/MySharePage.tsx`** - إخفاء النسبة من PDF
4. **`src/components/ThemeColorPicker.tsx`** - توسيع نظام الألوان ليشمل جميع المتغيرات + دعم الوضع الداكن + مراقبة التبديل
5. **`src/index.css`** - تحويل 7 تدرجات/ظلال من قيم ثابتة إلى `var(--primary)` ديناميكي
