-- تشديد سياسة INSERT على conversations: منع فتح محادثات مباشرة بين مستفيد/واقف وأدوار غير مقصودة.
-- القاعدة: المحادثات مع المستفيد/الواقف تُوجَّه حصراً للأدمن (منطق الدعم الفني).
-- الأدمن/المحاسب يستطيعان فتح محادثة مع أي مستخدم (إشعارات، متابعة).

DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

CREATE POLICY "Users can create scoped conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND (
    -- محادثة بلا مشارك محدد (broadcast/رسالة عامة)
    participant_id IS NULL
    -- المنشئ أدمن أو محاسب → يمكنه مراسلة أي دور
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
    -- المنشئ مستفيد/واقف → المشارك يجب أن يكون أدمن (تذاكر دعم فقط)
    OR (
      (has_role(auth.uid(), 'beneficiary'::app_role) OR has_role(auth.uid(), 'waqif'::app_role))
      AND has_role(participant_id, 'admin'::app_role)
    )
  )
);