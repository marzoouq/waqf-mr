import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { rpc } from '@/lib/api/rpc';

export interface VerifiedDocument {
  doc_number: string;
  doc_type: string;
  issued_at: string;
  page_count: number | null;
  status: string;
}

/** التحقق العام من وثيقة رسمية عبر رمز QR — بيانات غير شخصية فقط */
export function useVerifyDocumentPage() {
  const { code = '' } = useParams<{ code: string }>();
  const valid = /^[0-9a-f]{24}$/.test(code);
  const query = useQuery({
    queryKey: ['verify-document', code],
    enabled: valid,
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const rows = (await rpc('verify_issued_document', { p_code: code }, { signal })) as VerifiedDocument[] | null;
      return rows?.[0] ?? null;
    },
  });
  return { valid, document: query.data ?? null, isLoading: valid && query.isLoading };
}
