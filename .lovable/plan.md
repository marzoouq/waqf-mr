

# إضافة سمة `name` لجميع حقول Input المفقودة

## الوضع الحالي
- **103 حقل Input** في **11 ملف** تحتوي بالفعل على `name=`
- **~400 حقل Input** في **~34 ملف** تفتقد سمة `name`
- الحقول بدون `name` تستخدم معرّفات `id` مثل `"expense-form-dialog-field-1"` — وهي غير مفيدة للإكمال التلقائي

## المنهجية
- لكل حقل Input بدون `name`، سيتم إضافة `name` بقيمة وصفية مناسبة بناءً على السياق (مثلاً `name="amount"`, `name="date"`, `name="tenant_name"`)
- استخدام أسماء متوافقة مع معايير الإكمال التلقائي حيثما أمكن (مثل `email`, `password`, `name`, `tel`)
- حقول البحث تأخذ `name="search"`، حقول التاريخ `name="date_from"` / `name="date_to"`

## الملفات المتأثرة (~34 ملف)

| المجموعة | الملفات | عدد الحقول التقريبي |
|-----------|---------|---------------------|
| الإعدادات | AppearanceTab, NotificationsTab, BulkNotificationsTab | ~5 |
| المصروفات | ExpenseFormDialog | ~4 |
| الفواتير | CreateInvoiceFromTemplate, InvoicesPage + مكونات فرعية | ~15 |
| العقود | ContractsPage, ContractFormDialog + مكونات فرعية | ~20 |
| إدارة المستخدمين | UserDialogs, CreateUserForm | ~5 |
| الفلاتر | AdvancedFiltersBar | ~2 |
| المحاسبة | AccountsCollectionTable | ~6 |
| المستفيدين | BeneficiariesPage + مكونات فرعية | ~10 |
| التوزيعات/الزكاة | DistributionsPage, ZakatPage | ~10 |
| صفحات أخرى | MessagesPage, SupportDashboard, وغيرها | ~20+ |

## أمثلة على التسمية

```
// قبل
<Input id="expense-form-dialog-field-1" type="number" value={formData.amount} .../>

// بعد
<Input id="expense-form-dialog-field-1" name="amount" type="number" value={formData.amount} .../>
```

```
// قبل
<Input id="advanced-filters-bar-field-1" type="date" value={filters.dateFrom} .../>

// بعد  
<Input id="advanced-filters-bar-field-1" name="date_from" type="date" value={filters.dateFrom} .../>
```

## ملاحظات
- لا تغيير في السلوك الوظيفي — فقط تحسين تجربة المستخدم مع الإكمال التلقائي
- حقول كلمة المرور والبريد ستُعطى أسماء قياسية (`password`, `email`) لتفعيل الإكمال التلقائي بشكل أفضل

