/**
 * هوك مشترك لإعادة المحاولة — يُبطل مفاتيح الاستعلامات المحددة
 */
import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useRetryQueries(queryKeys: string[]) {
  const queryClient = useQueryClient();
  // استخدام ref لتجنب إعادة إنشاء الدالة عند تغيير المصفوفة
  const keysRef = useRef(queryKeys);
  keysRef.current = queryKeys;

  return useCallback(() => {
    keysRef.current.forEach(key =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    );
  }, [queryClient]);
}
