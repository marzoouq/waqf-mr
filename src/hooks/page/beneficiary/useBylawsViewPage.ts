/**
 * هوك صفحة اللائحة التنظيمية — يستخرج كل المنطق من BylawsViewPage
 */
import { useMemo, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBylaws } from '@/hooks/data/content/useBylaws';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { generateBylawsPDF } from '@/utils/pdf';

export function useBylawsViewPage() {
  const queryClient = useQueryClient();
  const handleRetry = useCallback(() => queryClient.invalidateQueries({ queryKey: ['bylaws'] }), [queryClient]);
  const { data: bylaws, isLoading, isError } = useBylaws();
  const { data: settings, isLoading: settingsLoading } = useAppSettings();
  const pdfWaqfInfo = usePdfWaqfInfo();
  const [search, setSearch] = useState('');

  const isPublished = settings?.bylaws_published === 'true';

  const allVisible = useMemo(() => (bylaws || []).filter((b) => b.is_visible), [bylaws]);

  const visibleBylaws = useMemo(() => {
    if (!search.trim()) return allVisible;
    const q = search.trim().toLowerCase();
    return allVisible.filter(
      (b) =>
        b.part_title.toLowerCase().includes(q) ||
        (b.chapter_title && b.chapter_title.toLowerCase().includes(q)) ||
        b.content.toLowerCase().includes(q),
    );
  }, [allVisible, search]);

  // تجميع البنود حسب الجزء
  const groupedByPart = useMemo(() => {
    return visibleBylaws.reduce((acc, item) => {
      const key = item.part_number;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<number, typeof visibleBylaws>);
  }, [visibleBylaws]);

  const partNumbers = useMemo(
    () => Object.keys(groupedByPart).map(Number).sort((a, b) => a - b),
    [groupedByPart],
  );

  const handleExportPdf = useCallback(
    () => generateBylawsPDF(visibleBylaws, pdfWaqfInfo),
    [visibleBylaws, pdfWaqfInfo],
  );

  return {
    // حالات التحميل والخطأ
    isLoading: isLoading || settingsLoading,
    isError,
    isPublished,
    // بيانات البحث
    search, setSearch,
    // بيانات مجمّعة
    visibleBylaws, groupedByPart, partNumbers,
    // دوال الإجراءات
    handleRetry, handleExportPdf,
  };
}
