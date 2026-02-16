<div dir="rtl">

# توثيق قاعدة البيانات

## مخطط العلاقات (ERD)

</div>

```mermaid
erDiagram
    user_roles {
        uuid id PK
        uuid user_id FK
        app_role role
        timestamptz created_at
    }

    beneficiaries {
        uuid id PK
        text name
        numeric share_percentage
        uuid user_id FK "nullable"
        text email
        text phone
        text bank_account
        text national_id
        text notes
    }

    properties {
        uuid id PK
        text property_number
        text property_type
        text location
        numeric area
        text description
    }

    units {
        uuid id PK
        uuid property_id FK
        text unit_number
        text unit_type
        text floor
        numeric area
        text status
    }

    contracts {
        uuid id PK
        text contract_number
        uuid property_id FK
        uuid unit_id FK "nullable"
        text tenant_name
        date start_date
        date end_date
        numeric rent_amount
        text payment_type
        numeric payment_amount
        integer payment_count
        text status
    }

    income {
        uuid id PK
        text source
        numeric amount
        date date
        uuid property_id FK "nullable"
        uuid contract_id FK "nullable"
        uuid fiscal_year_id FK "nullable"
        text notes
    }

    expenses {
        uuid id PK
        text expense_type
        numeric amount
        date date
        text description
        uuid property_id FK "nullable"
        uuid fiscal_year_id FK "nullable"
    }

    invoices {
        uuid id PK
        text invoice_type
        text invoice_number
        numeric amount
        date date
        text status
        text file_path
        uuid property_id FK "nullable"
        uuid contract_id FK "nullable"
        uuid expense_id FK "nullable"
        uuid fiscal_year_id FK "nullable"
    }

    fiscal_years {
        uuid id PK
        text label
        date start_date
        date end_date
        text status
    }

    accounts {
        uuid id PK
        text fiscal_year
        numeric total_income
        numeric total_expenses
        numeric vat_amount
        numeric zakat_amount
        numeric admin_share
        numeric waqif_share
        numeric waqf_revenue
        numeric waqf_corpus_previous
        numeric waqf_corpus_manual
        numeric distributions_amount
    }

    distributions {
        uuid id PK
        uuid account_id FK
        uuid beneficiary_id FK
        numeric amount
        date date
        text status
    }

    tenant_payments {
        uuid id PK
        uuid contract_id FK
        integer paid_months
        text notes
    }

    conversations {
        uuid id PK
        uuid created_by
        uuid participant_id "nullable"
        text subject
        text type
        text status
    }

    messages {
        uuid id PK
        uuid conversation_id FK
        uuid sender_id
        text content
        boolean is_read
    }

    notifications {
        uuid id PK
        uuid user_id
        text title
        text message
        text type
        text link
        boolean is_read
    }

    audit_log {
        uuid id PK
        text table_name
        text operation
        uuid record_id
        jsonb old_data
        jsonb new_data
        uuid user_id
    }

    app_settings {
        text key PK
        text value
    }

    properties ||--o{ units : "تحتوي"
    properties ||--o{ contracts : "مرتبطة"
    units ||--o{ contracts : "مؤجرة"
    contracts ||--o{ income : "تولّد"
    contracts ||--o{ invoices : "لها فواتير"
    contracts ||--|| tenant_payments : "دفعات"
    properties ||--o{ income : "دخل"
    properties ||--o{ expenses : "مصروفات"
    expenses ||--o{ invoices : "فاتورة مصروف"
    fiscal_years ||--o{ income : "سنة مالية"
    fiscal_years ||--o{ expenses : "سنة مالية"
    fiscal_years ||--o{ invoices : "سنة مالية"
    accounts ||--o{ distributions : "توزيعات"
    beneficiaries ||--o{ distributions : "يستلم"
    conversations ||--o{ messages : "رسائل"
```

<div dir="rtl">

---

## الجداول والأعمدة

### 1. `user_roles` — أدوار المستخدمين
| العمود | النوع | وصف |
|--------|-------|------|
| `id` | UUID | المعرف الفريد |
| `user_id` | UUID | معرف المستخدم (من نظام المصادقة) |
| `role` | app_role | الدور: `admin` / `beneficiary` / `waqif` |

### 2. `properties` — العقارات
| العمود | النوع | وصف |
|--------|-------|------|
| `property_number` | text | رقم العقار |
| `property_type` | text | نوع العقار (عمارة/أرض/...) |
| `location` | text | الموقع |
| `area` | numeric | المساحة بالمتر المربع |

### 3. `units` — الوحدات العقارية
| العمود | النوع | وصف |
|--------|-------|------|
| `property_id` | UUID | العقار التابعة له |
| `unit_number` | text | رقم الوحدة |
| `unit_type` | text | نوع الوحدة (شقة/محل/...) |
| `status` | text | الحالة: شاغرة / مؤجرة |
| `floor` | text | الطابق |

### 4. `contracts` — العقود
| العمود | النوع | وصف |
|--------|-------|------|
| `contract_number` | text | رقم العقد |
| `property_id` | UUID | العقار |
| `unit_id` | UUID | الوحدة (اختياري) |
| `tenant_name` | text | اسم المستأجر |
| `rent_amount` | numeric | مبلغ الإيجار الإجمالي |
| `payment_type` | text | نوع الدفع: سنوي/نصف سنوي/ربعي/شهري |
| `status` | text | الحالة: active / expired |

### 5. `income` — الإيرادات
| العمود | النوع | وصف |
|--------|-------|------|
| `source` | text | مصدر الدخل |
| `amount` | numeric | المبلغ |
| `date` | date | التاريخ |
| `fiscal_year_id` | UUID | السنة المالية |

### 6. `expenses` — المصروفات
| العمود | النوع | وصف |
|--------|-------|------|
| `expense_type` | text | النوع: كهرباء/مياه/صيانة/عمالة/... |
| `amount` | numeric | المبلغ |
| `date` | date | التاريخ |
| `fiscal_year_id` | UUID | السنة المالية |

### 7. `accounts` — الحسابات الختامية
| العمود | النوع | وصف |
|--------|-------|------|
| `fiscal_year` | text | تسمية السنة المالية |
| `total_income` | numeric | إجمالي الدخل |
| `total_expenses` | numeric | إجمالي المصروفات |
| `vat_amount` | numeric | ضريبة القيمة المضافة |
| `zakat_amount` | numeric | الزكاة |
| `admin_share` | numeric | حصة الناظر |
| `waqif_share` | numeric | حصة الواقف |
| `waqf_revenue` | numeric | ريع الوقف (للتوزيع) |
| `waqf_corpus_previous` | numeric | رصيد جسم الوقف السابق |
| `waqf_corpus_manual` | numeric | استقطاع جسم الوقف |
| `distributions_amount` | numeric | إجمالي التوزيعات |

### 8. `beneficiaries` — المستفيدين
| العمود | النوع | وصف |
|--------|-------|------|
| `name` | text | الاسم الكامل |
| `share_percentage` | numeric | نسبة الحصة (%) |
| `user_id` | UUID | ربط بحساب مستخدم (اختياري) |
| `national_id` | text | رقم الهوية الوطنية |
| `bank_account` | text | رقم الحساب البنكي |

---

## سياسات الأمان (RLS)

كل جدول محمي بسياسات:

| الجدول | القراءة | الكتابة |
|--------|---------|---------|
| `user_roles` | المستخدم يرى دوره فقط | الناظر فقط |
| `properties` | جميع الأدوار | الناظر فقط |
| `contracts` | جميع الأدوار | الناظر فقط |
| `income` | جميع الأدوار | الناظر فقط |
| `expenses` | جميع الأدوار | الناظر فقط |
| `accounts` | جميع الأدوار | الناظر فقط |
| `beneficiaries` | المستفيد يرى بياناته + الناظر | الناظر فقط |
| `distributions` | المستفيد يرى توزيعاته + الناظر والواقف | الناظر فقط |
| `notifications` | المستخدم يرى إشعاراته | الناظر لكل الإشعارات |
| `audit_log` | الناظر فقط | لا أحد (triggers فقط) |

---

## المشغلات (Triggers) — 22 مشغل نشط

| النوع | العدد | الوصف |
|-------|-------|-------|
| `audit_trigger` | 10 | تسجيل التغييرات في `audit_log` للجداول المالية والتعاقدية |
| `prevent_closed_fy` | 3 | منع تعديل بيانات السنوات المالية المقفلة (income, expenses, invoices) |
| `update_updated_at` | 9 | تحديث حقل `updated_at` تلقائياً عند التعديل |

---

## الدوال المخزنة (Functions)

| الدالة | الوصف |
|--------|-------|
| `has_role(user_id, role)` | التحقق من دور المستخدم (SECURITY DEFINER) |
| `notify_admins(title, message)` | إرسال إشعار لجميع المسؤولين |
| `notify_all_beneficiaries(title, message)` | إرسال إشعار لجميع المستفيدين |
| `audit_trigger_func()` | تسجيل التغييرات في سجل المراجعة |
| `prevent_closed_fiscal_year_modification()` | منع تعديل السنة المالية المقفلة |
| `update_updated_at_column()` | تحديث حقل `updated_at` تلقائياً |
| `get_public_stats()` | إحصائيات عامة للصفحة الرئيسية |

</div>
