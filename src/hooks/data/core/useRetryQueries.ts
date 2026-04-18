/**
 * هوك مشترك لإعادة المحاولة — يُبطل مفاتيح الاستعلامات المحددة
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStableRef } from '@/lib/hooks/useStableRef';

export function useRetryQueries(queryKeys: string[]) {
  const queryClient = useQueryClient();
  // useStableRef يحدّث المرجع داخل useEffect (متوافق مع React Compiler)
  const keysRef = useStableRef(queryKeys);

  return useCallback(() => {
    keysRef.current.forEach(key =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    );
  }, [queryClient, keysRef]);
}
