

## اختبارات وحدة لمكون NativeSelect

### الاختبارات المطلوبة

إنشاء ملف `src/components/ui/native-select.test.tsx` يغطي:

1. **العرض الأساسي** — يعرض الخيارات بشكل صحيح
2. **Placeholder** — يظهر كخيار معطّل عند تمريره
3. **بدون Placeholder** — لا يعرض خيار فارغ
4. **onValueChange** — يُستدعى بالقيمة الصحيحة عند التغيير
5. **disabled** — يكون عنصر select معطّلاً
6. **خيار معطّل** — الخيار الفردي يكون disabled
7. **القيمة المحددة** — يعكس القيمة الحالية
8. **className و triggerClassName** — تُطبَّق على العناصر الصحيحة
9. **أيقونة ChevronDown** — موجودة دائماً
10. **ref forwarding** — يمرر ref للعنصر الخارجي

### التنفيذ
ملف واحد جديد باستخدام `@testing-library/react` + `vitest` + `fireEvent.change`.

