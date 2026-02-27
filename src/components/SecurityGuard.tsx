import { useEffect } from 'react';

/**
 * SecurityGuard component - lightweight version
 * Prevents copying, selecting, dragging, and context menu on elements marked with data-sensitive attribute.
 */
const SecurityGuard = () => {
  useEffect(() => {
    // Disable copy for sensitive content only
    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest('[data-sensitive]')) {
        e.preventDefault();
      }
    };

    // Disable drag on sensitive content
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest('[data-sensitive]')) {
        e.preventDefault();
      }
    };

    // Disable text selection on sensitive content
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target?.closest('[data-sensitive]')) {
        e.preventDefault();
      }
    };

    // Disable right-click context menu on sensitive content
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest('[data-sensitive]')) {
        e.preventDefault();
      }
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return null;
};

export default SecurityGuard;
