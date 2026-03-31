# src/utils/

دوال مساعدة نقية (pure helper functions) لا تحتفظ بحالة.

## القاعدة
ضع هنا **دوال نقية** قابلة للاختبار بسهولة:
- تنسيق البيانات (format, maskData, safeNumber)
- تحويل الملفات (csv, xlsx)
- حسابات مالية (dashboardComputations, contractAllocation)
- توليد PDF (pdf/)
- تشخيصات (diagnostics/)

## الفرق عن `src/lib/`
- **`utils/`**: دوال نقية، بدون حالة، بدون اعتماد على مكتبات بنية تحتية
- **`lib/`**: بنية تحتية ذات حالة (logger, queryClient, performance monitors)
