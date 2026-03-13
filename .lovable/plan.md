

## خطة إصلاح فشل اختبارات CI (Run Tests workflow)

### المشكلة
الـ Run Tests workflow يفشل لكن لا يمكننا رؤية تفاصيل الخطأ لأن سجلات GitHub Actions تتطلب تسجيل دخول بصلاحيات admin.

### الحل: خطوتان

#### 1. تحسين CI لعرض تفاصيل الأخطاء
تعديل `.github/workflows/test.yml` لإضافة:
- `--reporter=verbose` لعرض كل اختبار بالاسم
- حفظ نتائج الاختبار كـ artifact حتى لو فشلت
- خطوة إضافية تكتب ملخص الأخطاء في GitHub Summary

```yaml
- name: Run tests with coverage
  run: npx vitest run --coverage --reporter=verbose 2>&1 | tee /tmp/test-output.txt
  continue-on-error: true

- name: Write test summary
  if: always()
  run: |
    echo '## Test Results' >> $GITHUB_STEP_SUMMARY
    tail -100 /tmp/test-output.txt >> $GITHUB_STEP_SUMMARY

- name: Check test result
  run: |
    if grep -q 'Tests.*failed' /tmp/test-output.txt; then
      echo "Tests failed — see summary above"
      exit 1
    fi
```

#### 2. إضافة `@types/qrcode` كـ devDependency
مكتبة `qrcode` مستخدمة في المشروع بدون أنواع TypeScript، وهذا قد يسبب مشاكل في بعض بيئات الاختبار.

### الملفات المتأثرة
| الملف | التغيير |
|-------|---------|
| `.github/workflows/test.yml` | تحسين عرض الأخطاء + حفظ النتائج |
| `package.json` | إضافة `@types/qrcode` |

### النتيجة المتوقعة
بعد تطبيق هذه التغييرات، عند الدفع التالي سيظهر ملخص تفصيلي للاختبارات الفاشلة في صفحة الـ workflow على GitHub (في قسم Summary)، مما يسمح بتشخيص المشكلة الفعلية وإصلاحها بدقة.

