/**
 * #8/#89 — hook منطق صفحة مراسلات الناظر/المحاسب
 *
 * نُقل من `src/hooks/page/beneficiary/useMessagesPage.ts` لأن صفحة `MessagesPage` في
 * `src/pages/dashboard/` تخدم أدوار الناظر والمحاسب وليس المستفيد. الإبقاء على
 * المسار القديم كـ re-export للتوافق مع أي مستهلكين خارجيين.
 */
export { useMessagesPage } from '@/hooks/page/beneficiary/useMessagesPage';
