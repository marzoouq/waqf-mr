

# توثيق شامل للجداول والأعمدة المفقودة في `docs/DATABASE.md`

## نظرة عامة
إضافة 5 جداول كاملة غائبة وأعمدة مفقودة من جداول `contracts` و `invoices` و `distributions` إلى التوثيق، مع تحديث مخطط Mermaid ERD وجدول سياسات RLS وعدد الجداول والدوال المخزنة.

## تأكيد: جدول `accounts` مكتمل
تم التحقق — كتلة Mermaid ERD (سطر 107-124) تتطابق تماماً مع الجدول النصي (سطر 284-298). لا تغييرات مطلوبة على `accounts`.

---

## التغيير 1: أعمدة مفقودة من جداول موجودة

### 1a. `contracts` — كتلة Mermaid
إضافة عمودين مفقودين:
```text
        text notes "nullable"
        uuid fiscal_year_id FK "nullable"
```

### 1b. `contracts` — الجدول النصي
إضافة صفين:
```text
| `fiscal_year_id` | UUID | السنة المالية (اختياري) |
| `notes` | text | ملاحظات (اختياري) |
```

### 1c. `invoices` — كتلة Mermaid
إضافة عمودين مفقودين:
```text
        text description "nullable"
        text file_name "nullable"
```

### 1d. `invoices` — الجدول النصي
إضافة صفين:
```text
| `file_name` | text | اسم الملف الأصلي (اختياري) |
| `description` | text | وصف الفاتورة (اختياري) |
```

### 1e. `fiscal_years` — كتلة Mermaid
إضافة `published`:
```text
        boolean published
```

### 1f. `distributions` — كتلة Mermaid
إضافة `fiscal_year_id`:
```text
        uuid fiscal_year_id FK "nullable"
```

---

## التغيير 2: إضافة 5 جداول جديدة

### الجداول:
1. `access_log_archive` — أرشيف سجل الوصول (8 أعمدة)
2. `advance_requests` — طلبات السلف (9 أعمدة)
3. `advance_carryforward` — ترحيل فروقات السلف (6 أعمدة)
4. `webauthn_challenges` — تحديات المصادقة البيومترية (3 أعمدة)
5. `webauthn_credentials` — بيانات اعتماد WebAuthn (6 أعمدة)

يتم إضافة كل جدول في:
- كتلة Mermaid ERD (تعريف الجدول + العلاقات)
- الجدول النصي التفصيلي مع الأوصاف

### علاقات Mermaid الجديدة:
```text
    beneficiaries ||--o{ advance_requests : "طلبات سلف"
    beneficiaries ||--o{ advance_carryforward : "ترحيل سلف"
    fiscal_years ||--o{ advance_requests : "سنة مالية"
    fiscal_years ||--o{ advance_carryforward : "من سنة"
    fiscal_years ||--o{ distributions : "سنة مالية"
```

---

## التغيير 3: تحديث جدول سياسات RLS

تحديث العنوان من "19 جدول/عرض" إلى "24 جدول/عرض" وإضافة 5 صفوف للجداول الجديدة مع وصف سياسات SELECT و INSERT/UPDATE/DELETE لكل منها.

---

## التغيير 4: تحديث عدد الدوال المخزنة

تغيير "8 دوال" إلى "20 دالة" وإضافة 12 دالة مفقودة تشمل:
- `execute_distribution` — تنفيذ توزيع الحصص
- `reopen_fiscal_year` — إعادة فتح سنة مالية
- `encrypt_pii` / `decrypt_pii` — تشفير/فك تشفير البيانات الحساسة
- `cleanup_expired_challenges` — حذف تحديات WebAuthn المنتهية
- وغيرها

---

## التحقق من الأخطاء الإملائية

جميع أسماء الأعمدة تم فحصها مقابل schema قاعدة البيانات الفعلية (المقدمة في useful-context). لا توجد أخطاء إملائية.

| العمود | الجدول | النتيجة |
|---|---|---|
| `fiscal_year_id` | contracts | مطابق |
| `notes` | contracts | مطابق |
| `description` | invoices | مطابق |
| `file_name` | invoices | مطابق |
| `published` | fiscal_years | مطابق |
| `fiscal_year_id` | distributions | مطابق |
| `archived_at` | access_log_archive | مطابق |
| `rejection_reason` | advance_requests | مطابق |
| `from_fiscal_year_id` | advance_carryforward | مطابق |
| `credential_id` | webauthn_credentials | مطابق |
| `transports` | webauthn_credentials (ARRAY) | مطابق |

---

## الملفات المتأثرة
1. `docs/DATABASE.md` — جميع التغييرات (1-4)

