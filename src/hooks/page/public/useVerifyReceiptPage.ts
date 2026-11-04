import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { rpc } from '@/lib/api/rpc';

export interface VerifiedReceipt {
  receipt_number: string;
  paid_date: string;
  amount: number;
  status: string;
}

/** التحقق العام من سند القبض عبر رمز QR — بيانات غير شخصية فقط */
export function useVerifyReceiptPage() {
  const { code = '' } = useParams<{ code: string }>();
  const valid = /^[0-9a-f]{24}$/.test(code);
  const query = useQuery({
    queryKey: ['verify-receipt', code],
    enabled: valid,
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const rows = (await rpc('verify_receipt_voucher', { p_code: code }, { signal })) as VerifiedReceipt[] | null;
      return rows?.[0] ?? null;
    },
  });
  return { valid, receipt: query.data ?? null, isLoading: valid && query.isLoading };
}
