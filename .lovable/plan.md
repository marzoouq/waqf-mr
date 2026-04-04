

# خطة تحسين الأداء — المرحلة الخامسة

## التغييرات المطلوبة

### 1. استبدال `transition-all` في 7 مكونات مخصصة

| الملف | الحالي | البديل |
|--------|--------|--------|
| `AiAssistant.tsx` (2 مواقع) | `transition-all` | `transition-[transform,opacity]` |
| `InvoiceGridView.tsx` | `transition-all` | `transition-[transform,box-shadow]` |
| `BeneficiaryStatsRow.tsx` | `transition-all` | `transition-[width]` |
| `BetaBanner.tsx` | `transition-all` | `transition-[height,padding]` |
| `ThemeToggle.tsx` (2 مواقع) | `transition-all` | `transition-transform` |
| `ThemeColorPicker.tsx` | `transition-all` | `transition-[border-color,box-shadow]` |
| `ZatcaPhasePlatform.tsx` | `transition-all` | `transition-[border-color,box-shadow]` |

### 2. رفع staleTime للبيانات الحية

**تعديل:** `src/lib/queryStaleTime.ts`
- `STALE_REALTIME`: `10_000` → `60_000`
- `STALE_LIVE`: `5_000` → `15_000`

المبرر: Postgres Realtime يُبطل الكاش تلقائياً عند التغيير الفعلي، فلا حاجة لإعادة جلب عدوانية عند التنقل.

---

## ملخص

| # | الإجراء | الملفات | الأثر |
|---|---------|---------|-------|
| 1 | استبدال `transition-all` | 7 ملفات | منخفض |
| 2 | رفع staleTime | 1 ملف | منخفض |

**إجمالي:** 0 migrations، 8 ملفات. تغييرات آمنة وتجميلية.

