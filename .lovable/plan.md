
الخطة: تجهيز نص دعم جاهز للإرسال يتضمن كل المعرفات والرسائل المطلوبة لفك قفل Restore Point يدويًا.

1) استخدم النص التالي كما هو في تذكرة الدعم (يفضّل بالإنجليزية لسرعة المعالجة):

```text
Subject: Publish blocked for 24h - stuck restore point lock (CreateRestorePointActivity)

Hello Support Team,

Our project publishing is consistently failing for more than 24 hours with the same backend error, and it appears a restore-point lock is stuck.

Project details:
- Preview URL: https://id-preview--29470216-3df1-468f-b021-5c98b75b2920.lovable.app
- Published URL: https://waqf-wise-net-lovable-app.lovable.app

Workflow identifiers:
- workflowID: publish_29470216-3df1-468f-b021-5c98b75b2920-3ad976bb-5b80-4578-a129-4e1f2c69d425
- runID: 019ce711-c205-7109-9c8c-4cd465c854cc

Full error (key excerpts repeated across retries):
- failed to initiate restore point: activity error (type: CreateRestorePointActivity ...): (SUPABASE_BAD_REQUEST)
- supabase bad request: {"message":"Unable to proceed with creating a restore point it appears another is being created"}
- [DeployIntegrationsActivity] failed project hooks: PublishWorkflow failed ...
- failed to deploy integrations: activity error (type: DeployIntegrationsActivity ...)

Request:
Please manually clear/unblock the stuck restore point lock and release any blocked publish workflow for this project, then confirm once it is cleared so we can republish.

We already retried and waited 24+ hours with no change.

Thank you.
```

2) لو تريد نسخة عربية للدعم أيضًا، استخدم:

```text
العنوان: تعذر النشر لأكثر من 24 ساعة بسبب قفل Restore Point عالق

مرحبًا فريق الدعم،

النشر متعطل بشكل مستمر لأكثر من 24 ساعة، وتظهر نفس رسالة الخطأ التي تشير إلى وجود قفل Restore Point عالق.

المعرّفات:
- workflowID: publish_29470216-3df1-468f-b021-5c98b75b2920-3ad976bb-5b80-4578-a129-4e1f2c69d425
- runID: 019ce711-c205-7109-9c8c-4cd465c854cc

الخطأ الكامل (مقتطفات متكررة):
- failed to initiate restore point ... CreateRestorePointActivity ... SUPABASE_BAD_REQUEST
- {"message":"Unable to proceed with creating a restore point it appears another is being created"}
- DeployIntegrationsActivity failed / PublishWorkflow failed

الرجاء فك القفل العالق يدويًا (restore point lock) وتحرير مسار النشر لهذا المشروع، ثم تأكيد المعالجة حتى نعيد النشر.

شكرًا لكم.
```

3) بعد رد الدعم بفك القفل: أعد النشر مباشرة بنفس النسخة الحالية للتأكد أن العطل كان بنيويًا وليس من الكود.
