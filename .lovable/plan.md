
## تحليل المكونات الكبيرة واقتراحات التقسيم

بناءً على فحص حجم الملفات، إليك المكونات التي تتجاوز 200 سطر (باستثناء ملفات UI/shadcn والاختبارات):

### 🔴 أولوية عالية (> 230 سطر)

#### 1. `invoices/templates/ProfessionalTemplate.tsx` — 251 سطر
- **اقتراح**: فصل رأس الفاتورة (`InvoiceHeader`), جدول البنود (`InvoiceItemsTable`), ملخص المبالغ (`InvoiceTotals`), وتذييل QR/ZATCA (`InvoiceFooter`)

#### 2. `contracts/CollectionReport.tsx` — 235 سطر
- **اقتراح**: فصل فلاتر التقرير (`CollectionFilters`), جدول التحصيل (`CollectionTable`), وملخص الإحصائيات (`CollectionSummaryCards`)

#### 3. `zatca/ZatcaInvoicesTab.tsx` — 229 سطر
- **اقتراح**: فصل شريط البحث/الفلاتر (`ZatcaInvoiceFilters`), جدول الفواتير (`ZatcaInvoiceTable`), وأزرار الإجراءات (`ZatcaInvoiceActions`)

### 🟡 أولوية متوسطة (200-230 سطر)

#### 4. `reports/MonthlyPerformanceReport.tsx` — 224 سطر
- **اقتراح**: فصل الرسوم البيانية (`PerformanceCharts`) عن جدول البيانات (`PerformanceTable`)

#### 5. `reports/YearOverYearComparison.tsx` — 220 سطر
- **اقتراح**: فصل الرسم البياني (`YoYChart`) عن جدول المقارنة (`YoYComparisonTable`)

#### 6. `accounts/AccountsDistributionTable.tsx` — 219 سطر
- **اقتراح**: فصل صف المستفيد (`DistributionRow`) وملخص التوزيع (`DistributionSummary`)

#### 7. `reports/CashFlowReport.tsx` — 218 سطر
- **اقتراح**: فصل الرسم البياني (`CashFlowChart`) عن تفاصيل التدفق (`CashFlowDetails`)

#### 8. `zatca/ZatcaCertificatesTab.tsx` — 207 سطر
- **اقتراح**: فصل نموذج الشهادة (`CertificateForm`) عن قائمة الشهادات (`CertificatesList`)

#### 9. `auth/LoginForm.tsx` — 206 سطر
- **اقتراح**: فصل نموذج الهوية الوطنية (`NationalIdLoginSection`) عن نموذج البريد/كلمة المرور (`EmailLoginSection`)

#### 10. `user-management/UsersTable.tsx` — 205 سطر
- **اقتراح**: فصل صف المستخدم (`UserRow`) وأزرار الإجراءات (`UserActions`)

### ✅ مقبولة حالياً (< 200 سطر)
الملفات تحت 200 سطر في نطاق معقول ولا تحتاج تقسيم عاجل.

### ملاحظات:
- ملفات `ui/sidebar.tsx` (637) و `ui/chart.tsx` (305) و `ui/carousel.tsx` (224) هي مكونات shadcn أساسية — **لا يُنصح بتعديلها**
- التقسيم يجب أن يكون تدريجياً لتجنب كسر الوظائف الحالية
- الأولوية للملفات التي تخلط بين منطق البيانات وعرض الواجهة

هل تريد البدء بتنفيذ تقسيم محدد؟ أقترح البدء بالأولوية العالية (1-3).
