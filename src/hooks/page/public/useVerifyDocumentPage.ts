import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { rpc } from '@/lib/api/rpc';
import { contentKeys } from '@/lib/queryKeys/contentKeys';

export interface VerifiedDocument {
  doc_number: string;
  doc_type: string;
  issued_at: string;
  page_count: number | null;
  status: string;
}

/** التحقق العام بالرقم المطبوع أو رمز QR — بيانات غير شخصية فقط */
export function useVerifyDocumentPage() {
  const { code: rawCode = '' } = useParams<{ code: string }>();
  const code = rawCode.trim();
  const valid = /^[0-9a-f]{24}$/.test(code) || /^[A-Za-z0-9][A-Za-z0-9/-]{1,63}$/.test(code);
  const query = useQuery({
    queryKey: contentKeys.documentVerification(code),
    enabled: valid,
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const rows = (await rpc('verify_issued_document', { p_code: code }, { signal })) as VerifiedDocument[] | null;
      return rows?.[0] ?? null;
    },
  });
  return { valid, document: query.data ?? null, isLoading: valid && query.isLoading };
}
