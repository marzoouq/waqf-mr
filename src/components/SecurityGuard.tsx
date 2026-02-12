import { useEffect } from 'react';

/**
 * SecurityGuard component - lightweight version
 * Only prevents copying on elements marked with data-sensitive attribute
 * and disables drag on sensitive content.
 */
const SecurityGuard = () => {
  useEffect(() => {
    // Disable copy for sensitive content only
    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest('[data-sensitive]')) {
        e.preventDefault();
        return false;
      }
    };

    // Disable drag on sensitive content
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest('[data-sensitive]')) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  return null;
};

export default SecurityGuard;
