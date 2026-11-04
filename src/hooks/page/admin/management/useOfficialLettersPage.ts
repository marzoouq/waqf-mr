import { useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';
import {
  useOfficialLetters, useSaveOfficialLetter, useVoidOfficialLetter, type OfficialLetterRow,
} from '@/hooks/data/content/useOfficialLetters';

export interface LetterForm { letterType: string; recipient: string; subject: string; body: string }
const EMPTY: LetterForm = { letterType: 'statement', recipient: '', subject: '', body: '' };

export const useOfficialLettersPage = () => {
  const [form, setForm] = useState<LetterForm>(EMPTY);
  const [issuing, setIssuing] = useState(false);
  const waqfInfo = usePdfWaqfInfo();
  const letters = useOfficialLetters();
  const save = useSaveOfficialLetter();
  const voidLetter = useVoidOfficialLetter();

  const canIssue = form.recipient.trim().length > 1 && form.subject.trim().length > 1 && form.body.trim().length > 5;

  const issue = async () => {
    if (!canIssue) { toast.error('أكمل الجهة والموضوع ونص الوثيقة'); return; }
    setIssuing(true);
    try {
      const { generateOfficialLetterPDF } = await import('@/utils/pdf/entities/officialLetterPdf');
      const ref = await generateOfficialLetterPDF({ ...form }, waqfInfo);
      if (!ref) { toast.error('تعذّر تسجيل الوثيقة — لم تُعتمد'); return; }
      await save.mutateAsync({
        letter_type: form.letterType, recipient: form.recipient.trim(), subject: form.subject.trim(),
        body: form.body.trim(), doc_number: ref.docNumber, verification_code: ref.verificationCode,
      });
      toast.success(`صدرت الوثيقة المعتمدة رقم ${ref.docNumber}`);
      setForm(EMPTY);
    } catch (err) {
      logger.error('[official-letter] issue failed', err);
      toast.error('تعذّر إصدار الوثيقة');
    } finally {
      setIssuing(false);
    }
  };

  const reprint = async (row: OfficialLetterRow) => {
    if (!row.doc_number || !row.verification_code) return;
    const { generateOfficialLetterPDF } = await import('@/utils/pdf/entities/officialLetterPdf');
    await generateOfficialLetterPDF({
      letterType: row.letter_type, recipient: row.recipient, subject: row.subject, body: row.body, status: row.status,
      existingRef: { docNumber: row.doc_number, verificationCode: row.verification_code, issuedAt: row.created_at },
    }, waqfInfo);
  };

  const cancel = async (row: OfficialLetterRow) => {
    try { await voidLetter.mutateAsync(row.id); toast.success('أُلغيت الوثيقة وسيظهر ذلك في صفحة التحقق'); }
    catch (err) { logger.error('[official-letter] void failed', err); toast.error('تعذّر إلغاء الوثيقة'); }
  };

  return { form, setForm, canIssue, issuing, issue, letters: letters.data ?? [], isLoading: letters.isLoading, reprint, cancel };
};
