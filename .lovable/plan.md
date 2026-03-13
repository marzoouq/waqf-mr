

# تقرير التحقق الشامل + خطة التنفيذ

## الوضع الحالي — ما تم تنفيذه (مؤكد ✅)

جميع الاختبارات الخمسة المطلوبة سابقاً **موجودة وسليمة**، لا تعارضات أو تناقضات:

| الملف | اختبارات | تطابق مع المصدر |
|--------|----------|-----------------|
| `useAuditLog.test.ts` | 7 | ✅ الترجمات + pagination + تنظيف searchQuery |
| `useRealtimeAlerts.test.ts` | 5 | ✅ فلترة الأدوار + cleanup القناة |
| `useSupportTickets.test.ts` | 7 | ✅ جميع الـ hooks المُصدّرة |
| `useAccessLog.test.ts` | 3 | ✅ RPC params + silent fail |
| `usePdfWaqfInfo.test.ts` | 3 | ✅ بناء deedNumber + vatNumber |

## ما لا يزال بدون تغطية (مؤكد ❌)

### أولوية عالية — منطق حرج
| الملف | سطور | السبب |
|--------|-------|-------|
| `useAccountsPage.ts` | 557 | أكبر hook — allocationMap, financials, closeYear, collectionData |
| `pdf/paymentInvoice.ts` | 190 | فواتير ZATCA + QR + رفع Storage |

### أولوية متوسطة
| الملف | سطور | السبب |
|--------|-------|-------|
| `pdf/accounts.ts` | 268 | تقرير توزيع الحصص |
| `pdf/reports.ts` | 259 | التقرير السنوي |
| `printShareReport.ts` | 101 | طباعة تقرير المستفيد |
| `printDistributionReport.ts` | 175 | طباعة تقرير التوزيع |
| `pdf/pdfHelpers.ts` | 8 | `getLastAutoTableY` بسيطة لكن مستخدمة في كل PDF |

### أولوية منخفضة
| الملف | السبب |
|--------|-------|
| `usePrefetchAccounts.ts` | 44 سطر — prefetch بسيط |
| `usePushNotifications.ts` | 46 سطر — Notification API |
| `loadAmiriFonts.ts` | 31 سطر — حقن CSS |
| `pdf/invoices.ts`, `pdf/entities.ts`, `pdf/beneficiary.ts`, `pdf/comparison.ts`, `pdf/comprehensiveBeneficiary.ts`, `pdf/expenses.ts`, `pdf/auditLog.ts` | مولّدات PDF مماثلة النمط |

## خطة التنفيذ — 4 ملفات اختبار جديدة (الأولوية العالية + المتوسطة)

### 1. `src/hooks/useAccountsPage.test.ts` (~12 اختبار)

أكبر وأهم ملف. سيتم اختبار:

- **`findAccountByFY`** (مُصدّرة): بحث بـ UUID أولاً ثم fallback بـ label، إرجاع أول عنصر إذا كان واحداً فقط
- **`allocationMap`**: يحسب التخصيص الديناميكي للعقود عبر السنوات المالية
- **`contracts` filtering**: يستبعد العقود الملغاة (`cancelled`)
- **`handleAdminPercentChange`**: يرفض القيم خارج 0-100
- **`handleWaqifPercentChange`**: نفس التحقق
- **`isCommercialContract`**: يحدد نوع العقد (تجاري/سكني) بناء على الوحدة والعقار
- **`collectionData`**: يحسب المتأخرات والمحصّل بشكل صحيح
- **`statusLabel`**: ترجمة حالات العقود
- **`buildAccountData`**: يبني كائن الحساب الصحيح

النمط: موك لـ 10+ hooks (`useAccounts`, `useIncome`, `useExpenses`, `useContracts`, `useBeneficiaries`, `useTenantPayments`, `useUnits`, `useProperties`, `useAppSettings`, `useFiscalYear`, `useAuth`) + `supabase`

### 2. `src/utils/pdf/paymentInvoice.test.ts` (~6 اختبارات)

- **`statusLabel`**: ترجمة الحالات (paid/pending/overdue/partially_paid)
- **`generatePaymentInvoicePDF`** بدون VAT: يولّد PDF بصف "معفاة من ضريبة القيمة المضافة"
- **`generatePaymentInvoicePDF`** مع VAT: يحسب المبلغ قبل الضريبة + يضيف QR
- **رفع Storage**: يستدعي `supabase.storage.upload` ويُحدّث `file_path`
- **إعادة المحاولة**: عند وجود ملف مكرر يضيف timestamp
- **Fallback**: عند فشل الرفع يستدعي `doc.save()`

النمط: موك لـ `jsPDF`, `autoTable`, `supabase.storage`, `loadArabicFont`, `addHeader`, `addFooter`, `generateZatcaQrTLV`, `generateQrDataUrl`

### 3. `src/utils/pdf/pdfHelpers.test.ts` (~2 اختبار)

- يُرجع `finalY` من `lastAutoTable`
- يُرجع fallback عند عدم وجود `lastAutoTable`

### 4. `src/utils/pdf/accounts.test.ts` (~3 اختبارات)

- `generateDistributionsPDF`: يرندر بدون خطأ مع بيانات عادية
- يحسب الإجماليات الصحيحة (سُلف، مرحّل، صافي)
- يتعامل مع فروق مرحّلة (deficit > 0)

## الإجمالي

```text
ملفات جديدة:     4
اختبارات جديدة:  ~23
الأولوية:        useAccountsPage (أعلى) → paymentInvoice → accounts → pdfHelpers
```

