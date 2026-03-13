

# تقرير تغطية الكود وتوصيات الاختبارات

## ملخص التغطية الحالية

المشروع يحتوي على **487 اختبار** في **84 ملف**. التغطية موزعة كالتالي:

### ✅ ملفات مغطاة بالكامل
- **الصفحات**: جميع صفحات `dashboard/` و `beneficiary/` والصفحات العامة — **100% تغطية ملفات**
- **السياقات**: `AuthContext` + `FiscalYearContext` — **100%**
- **الثوابت**: `constants/index.ts` — **100%**

### ⚠️ ملفات بدون اختبارات (الأولوية العالية)

#### Hooks (11 ملف بدون اختبار):
| الملف | الأهمية | السبب |
|-------|---------|-------|
| `useAccountsPage.ts` | عالية | منطق صفحة الحسابات الرئيسية |
| `useDistribute.ts` | عالية | توزيع الأرباح — عملية مالية حرجة |
| `useContractAllocations.ts` | عالية | تخصيص العقود |
| `useAccessLog.ts` | متوسطة | سجل الوصول |
| `useAuditLog.ts` | متوسطة | سجل التدقيق |
| `useAdvanceRequests.ts` | متوسطة | طلبات السلف |
| `useMessaging.ts` | متوسطة | الرسائل |
| `usePaymentInvoices.ts` | متوسطة | فواتير الدفع |
| `usePdfWaqfInfo.ts` | منخفضة | بيانات PDF |
| `usePrefetchAccounts.ts` | منخفضة | تحميل مسبق |
| `useRealtimeAlerts.ts` | منخفضة | تنبيهات فورية |
| `useSupportTickets.ts` | منخفضة | تذاكر الدعم |
| `usePushNotifications.ts` | منخفضة | إشعارات Push |
| `useIncome.ts` | منخفضة | مغطى جزئياً |
| `useTotalBeneficiaryPercentage.ts` | متوسطة | حساب النسب |

#### Utils (5 ملفات بدون اختبار):
| الملف | الأهمية |
|-------|---------|
| `contractAllocation.ts` | عالية — منطق تخصيص مالي |
| `contractHelpers.ts` | عالية — دوال مساعدة للعقود |
| `normalizeDigits.ts` | متوسطة — تحويل أرقام |
| `printDistributionReport.ts` | متوسطة |
| `printShareReport.ts` | متوسطة |

#### Utils/PDF (11 ملف، 2 فقط مغطاة):
`accounts.ts`, `auditLog.ts`, `beneficiary.ts`, `bylaws.ts`, `comparison.ts`, `comprehensiveBeneficiary.ts`, `entities.ts`, `expenses.ts`, `invoices.ts`, `paymentInvoice.ts`, `pdfHelpers.ts`, `reports.ts` — **جميعها بدون اختبار**

#### Components (12 ملف بدون اختبار):
| الملف | الأهمية |
|-------|---------|
| `auth/SignupForm.tsx` | **عالية جداً** — نموذج التسجيل |
| `auth/ResetPasswordForm.tsx` | عالية — نموذج استعادة كلمة المرور |
| `auth/BiometricLoginButton.tsx` | متوسطة |
| `GlobalSearch.tsx` | متوسطة |
| `BottomNav.tsx` | متوسطة |
| `PageHeaderCard.tsx` | منخفضة |
| `ThemeColorPicker.tsx` | منخفضة |
| `BetaBanner.tsx` | منخفضة |
| `PwaUpdateNotifier.tsx` | منخفضة |
| `PrintHeader.tsx` / `PrintFooter.tsx` | منخفضة |
| `LegalPageFooter.tsx` | منخفضة |
| `AiAssistant.tsx` | منخفضة |

#### Pages (3 ملفات بدون اختبار):
| الملف | الأهمية |
|-------|---------|
| `Auth.tsx` | **عالية جداً** — صفحة تسجيل الدخول |
| `NotFound.tsx` | منخفضة |
| `PrivacyPolicy.tsx` / `TermsOfUse.tsx` | منخفضة |

---

## خطة التنفيذ — الأولوية القصوى (10 ملفات)

سأنشئ اختبارات لأهم الملفات غير المغطاة:

### 1. `useDistribute.ts` — توزيع الأرباح
- اختبار حساب التوزيع الصحيح
- اختبار التحقق من المبالغ المتاحة

### 2. `useContractAllocations.ts` — تخصيص العقود
- اختبار CRUD عبر mock factory

### 3. `contractAllocation.ts` — منطق التخصيص
- اختبار دوال الحساب المالي

### 4. `contractHelpers.ts` — دوال العقود المساعدة
- اختبار التحويلات والتنسيقات

### 5. `normalizeDigits.ts` — تحويل الأرقام
- اختبار تحويل أرقام عربية/هندية

### 6. `useTotalBeneficiaryPercentage.ts` — حساب النسب
- اختبار أن المجموع لا يتجاوز 100%

### 7. `auth/SignupForm.tsx` — نموذج التسجيل
- اختبار التحقق من المدخلات والإرسال

### 8. `auth/ResetPasswordForm.tsx` — استعادة كلمة المرور
- اختبار إرسال البريد والأخطاء

### 9. `Auth.tsx` — صفحة المصادقة
- اختبار التبديل بين تسجيل الدخول والتسجيل

### 10. `NotFound.tsx` — صفحة 404
- اختبار بسيط للعرض

---

## الإحصائيات المتوقعة بعد التنفيذ

```text
                  الآن     بعد التنفيذ
Hooks مغطاة:     15/26    18/26  (69%)
Utils مغطاة:      5/10     8/10  (80%)
Components:      14/26    16/26  (62%)
Pages:           28/31    31/31  (100%)
─────────────────────────────────────
إجمالي:          ~487     ~530+  اختبار
```

