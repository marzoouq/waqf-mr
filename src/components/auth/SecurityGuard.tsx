import { useEffect } from 'react';

/**
 * SecurityGuard component - lightweight version
 * Prevents copying, selecting, dragging, and context menu on elements marked with data-sensitive attribute.
 *
 * ⚠️ Limitation: These protections are browser-level only. Users with access to
 * DevTools (Console, Elements panel) can bypass all client-side protections.
 * This is an inherent web platform limitation, not a bug. Server-side access
 * controls (RLS policies, encrypted PII) are the real security layer.
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
      const target = e.target as Node;
      const el = target instanceof HTMLElement ? target : target?.parentElement;
      if (el?.closest('[data-sensitive]')) {
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
