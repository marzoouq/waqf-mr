/**
 * useClearAppCache — مسح الذاكرة المؤقتة للتطبيق ثم إعادة التحميل (لكل الأدوار).
 * يعيد استخدام runDeepClean الذي يحفظ الجلسة وتفضيلات الجهاز.
 */
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { runDeepClean } from '@/lib/diagnostics/deepClean';
import { logger } from '@/lib/logger';

export function useClearAppCache() {
  const queryClient = useQueryClient();
  const [clearing, setClearing] = useState(false);

  const clear = useCallback(async () => {
    setClearing(true);
    try {
      await runDeepClean({ queryClient });
      toast.success('تم مسح الذاكرة المؤقتة، جارٍ تحميل أحدث نسخة...');
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      logger.error('[useClearAppCache] فشل:', e);
      toast.error('تعذّر مسح الذاكرة المؤقتة');
      setClearing(false);
    }
  }, [queryClient]);

  return { clear, clearing };
}
