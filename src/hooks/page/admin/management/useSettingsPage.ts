/**
 * هوك صفحة الإعدادات العامة — يفصل حالة التبويب والاستجابة عن الواجهة
 * يدعم deep linking عبر ?tab= في الـURL
 */
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIsMobile } from '@/hooks/ui/useIsMobile';

export function useSettingsPage(defaultTab: string = 'waqf') {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const activeTab = searchParams.get('tab') || defaultTab;

  const setActiveTab = useCallback((tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return { activeTab, setActiveTab, isMobile };
}
