/**
 * هوك صفحة الإعدادات العامة — يفصل حالة التبويب والاستجابة عن الواجهة
 */
import { useState } from 'react';
import { useIsMobile } from '@/hooks/ui/useIsMobile';

export function useSettingsPage(defaultTab: string = 'waqf') {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const isMobile = useIsMobile();
  return { activeTab, setActiveTab, isMobile };
}
