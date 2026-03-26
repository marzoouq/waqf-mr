/**
 * هوك إدارة حركة السحب للشريط الجانبي (swipe-to-close/open)
 */
import { useRef, useCallback } from 'react';

interface UseSidebarSwipeParams {
  sidebarWidth?: number;
  closeThreshold?: number;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
}

export function useSidebarSwipe({
  sidebarWidth = 256,
  closeThreshold = 80,
  mobileSidebarOpen,
  setMobileSidebarOpen,
}: UseSidebarSwipeParams) {
  const sidebarRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef(0);
  const isDragging = useRef(false);
  const sidebarTouchStartX = useRef(0);
  const rafId = useRef(0);

  // Edge swipe refs
  const edgeStartX = useRef(0);
  const edgeDragRef = useRef(0);
  const isEdgeSwiping = useRef(false);

  const applyTransform = useCallback((offset: number, total: number) => {
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      if (sidebarRef.current) {
        sidebarRef.current.style.transform = `translateX(${offset}px)`;
        sidebarRef.current.style.willChange = 'transform';
      }
      if (overlayRef.current) {
        const progress = Math.max(0, 1 - offset / total);
        overlayRef.current.style.opacity = String(progress * 0.5);
        overlayRef.current.style.willChange = 'opacity';
      }
    });
  }, []);

  const clearInlineStyles = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    if (sidebarRef.current) {
      sidebarRef.current.style.transform = '';
      sidebarRef.current.style.willChange = '';
    }
    if (overlayRef.current) {
      overlayRef.current.style.opacity = '';
      overlayRef.current.style.willChange = '';
    }
  }, []);

  // ─── Sidebar close swipe ───
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    sidebarTouchStartX.current = e.touches[0]!.clientX;
    isDragging.current = true;
    dragOffsetRef.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const delta = Math.max(0, e.touches[0]!.clientX - sidebarTouchStartX.current);
    if (delta < 10) return;
    dragOffsetRef.current = delta;
    applyTransform(delta, sidebarWidth);
  }, [applyTransform, sidebarWidth]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    clearInlineStyles();
    if (dragOffsetRef.current > closeThreshold) {
      navigator.vibrate?.(15);
      setMobileSidebarOpen(false);
    }
    dragOffsetRef.current = 0;
  }, [clearInlineStyles, closeThreshold, setMobileSidebarOpen]);

  // ─── Edge swipe-to-open ───
  const handleMainTouchStart = useCallback((e: React.TouchEvent) => {
    const x = e.touches[0]!.clientX;
    if (x > window.innerWidth - 25 && !mobileSidebarOpen) {
      edgeStartX.current = x;
      isEdgeSwiping.current = true;
      edgeDragRef.current = 0;
    }
  }, [mobileSidebarOpen]);

  const handleMainTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isEdgeSwiping.current) return;
    const delta = Math.max(0, Math.min(sidebarWidth, edgeStartX.current - e.touches[0]!.clientX));
    edgeDragRef.current = delta;
    applyTransform(sidebarWidth - delta, sidebarWidth);
  }, [applyTransform, sidebarWidth]);

  const handleMainTouchEnd = useCallback(() => {
    if (!isEdgeSwiping.current) return;
    isEdgeSwiping.current = false;
    clearInlineStyles();
    if (edgeDragRef.current > closeThreshold) {
      navigator.vibrate?.(15);
      setMobileSidebarOpen(true);
    }
    edgeDragRef.current = 0;
  }, [clearInlineStyles, closeThreshold, setMobileSidebarOpen]);

  const overlayOpacity = mobileSidebarOpen ? 0.5 : 0;
  const sidebarTranslateX = mobileSidebarOpen ? 0 : sidebarWidth;

  return {
    sidebarRef,
    overlayRef,
    // Sidebar swipe handlers
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    // Main area edge swipe handlers
    handleMainTouchStart,
    handleMainTouchMove,
    handleMainTouchEnd,
    // Computed values
    overlayOpacity,
    sidebarTranslateX,
  };
}
