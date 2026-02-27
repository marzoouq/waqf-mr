

# تحديث ERD Mermaid في `docs/DATABASE.md`

## نظرة عامة
إضافة `fiscal_year_id` المفقود في مخطط ERD Mermaid وعلاقة `fiscal_years` مع `accounts`.

## التغييرات

### ملف واحد: `docs/DATABASE.md`

**1. سطر 109-120** — إضافة `fiscal_year_id` في كتلة `accounts`:
```text
    accounts {
        uuid id PK
        text fiscal_year
        uuid fiscal_year_id FK "nullable"
        numeric total_income
        ...
    }
```

**2. سطر 213** — إضافة علاقة بعد سطر `fiscal_years ||--o{ invoices`:
```text
    fiscal_years ||--o{ accounts : "سنة مالية"
```

