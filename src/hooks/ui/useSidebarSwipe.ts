/**
 * هوك إدارة حركة السحب للشريط الجانبي (swipe-to-close/open)
 *
 * ⚠️ معماري: لا يُعرّض refs خام للـ caller — بل يُغلّفها داخل
 * `sidebarProps` و `overlayProps` (jsx-spread-friendly objects).
 *
 * يستخدم React state لإدارة `dragOffset` بدل DOM mutation مباشر،
 * لتفادي تعارض inline style مع React-managed style (يؤدي لتعليق على iOS).
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

interface UseSidebarSwipeParams {
  sidebarWidth?: number;
  closeThreshold?: number;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
}

const EDGE_ZONE = 12; // px من الحافة اليمنى لتفعيل swipe-to-open (مُقلَّص لتفادي تعارض إيماءة Safari iOS)

export function useSidebarSwipe({
  sidebarWidth = 256,
  closeThreshold = 80,
  mobileSidebarOpen,
  setMobileSidebarOpen,
}: UseSidebarSwipeParams) {
  // dragOffset: المسافة الحالية للسحب — null يعني لا سحب نشط
  const [dragOffset, setDragOffset] = useState<number | null>(null);

  const dragOffsetRef = useRef(0);
  const isDragging = useRef(false);
  const sidebarTouchStartX = useRef(0);
  const rafId = useRef(0);

  // Edge swipe refs
  const edgeStartX = useRef(0);
  const edgeStartY = useRef(0);
  const edgeDragRef = useRef(0);
  const isEdgeSwiping = useRef(false);

  // throttled setter — لتفادي إعادة الرسم في كل touchmove
  const scheduleOffset = useCallback((offset: number) => {
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      setDragOffset(offset);
    });
  }, []);

  const resetDrag = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    setDragOffset(null);
  }, []);

  // تنظيف rAF عند إلغاء mount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafId.current);
    };
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
    scheduleOffset(delta);
  }, [scheduleOffset]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const finalDelta = dragOffsetRef.current;
    dragOffsetRef.current = 0;
    resetDrag();
    if (finalDelta > closeThreshold) {
      navigator.vibrate?.(15);
      setMobileSidebarOpen(false);
    }
  }, [resetDrag, closeThreshold, setMobileSidebarOpen]);

  // ─── Edge swipe-to-open ───
  const handleMainTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]!;
    const x = touch.clientX;
    if (x > window.innerWidth - EDGE_ZONE && !mobileSidebarOpen) {
      edgeStartX.current = x;
      edgeStartY.current = touch.clientY;
      isEdgeSwiping.current = true;
      edgeDragRef.current = 0;
    }
  }, [mobileSidebarOpen]);

  const handleMainTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isEdgeSwiping.current) return;
    const touch = e.touches[0]!;
    const deltaX = edgeStartX.current - touch.clientX;
    const deltaY = Math.abs(touch.clientY - edgeStartY.current);
    // إذا كانت الحركة الرأسية أكبر، نلغي السحب (المستخدم يقوم بـ scroll)
    if (deltaY > Math.abs(deltaX) && deltaY > 10) {
      isEdgeSwiping.current = false;
      edgeDragRef.current = 0;
      resetDrag();
      return;
    }
    const delta = Math.max(0, Math.min(sidebarWidth, deltaX));
    edgeDragRef.current = delta;
    scheduleOffset(sidebarWidth - delta);
  }, [scheduleOffset, sidebarWidth, resetDrag]);

  const handleMainTouchEnd = useCallback(() => {
    if (!isEdgeSwiping.current) return;
    isEdgeSwiping.current = false;
    const finalDelta = edgeDragRef.current;
    edgeDragRef.current = 0;
    resetDrag();
    if (finalDelta > closeThreshold) {
      navigator.vibrate?.(15);
      setMobileSidebarOpen(true);
    }
  }, [resetDrag, closeThreshold, setMobileSidebarOpen]);

  // ─── Style calculation ───
  // dragOffset !== null أثناء السحب الفعلي → بلا transition للاستجابة الفورية
  // dragOffset === null → استخدام حالة open/closed مع transition سلس
  const sidebarTransform = useMemo(() => {
    if (dragOffset !== null) {
      return `translateX(${dragOffset}px)`;
    }
    return `translateX(${mobileSidebarOpen ? 0 : sidebarWidth}px)`;
  }, [dragOffset, mobileSidebarOpen, sidebarWidth]);

  const overlayProps = useMemo(() => {
    // أثناء السحب، تتدرّج الشفافية بناءً على dragOffset
    const opacity = dragOffset !== null
      ? Math.max(0, 1 - dragOffset / sidebarWidth) * 0.5
      : (mobileSidebarOpen ? 0.5 : 0);
    return {
      style: {
        backgroundColor: `rgba(0,0,0,${opacity})`,
        transition: dragOffset === null ? 'background-color 250ms ease-out' : 'none',
      },
      onTouchCancel: () => {
        // حماية إضافية: أي إلغاء touch على overlay يُعيد ضبط الحالة
        isDragging.current = false;
        isEdgeSwiping.current = false;
        resetDrag();
      },
    };
  }, [dragOffset, mobileSidebarOpen, sidebarWidth, resetDrag]);

  const sidebarProps = useMemo(() => ({
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchEnd,
    style: {
      transform: sidebarTransform,
      transition: dragOffset === null ? 'transform 250ms ease-out' : 'none',
      willChange: 'transform' as const,
    },
  }), [handleTouchStart, handleTouchMove, handleTouchEnd, sidebarTransform, dragOffset]);

  const mainTouchProps = useMemo(() => ({
    onTouchStart: handleMainTouchStart,
    onTouchMove: handleMainTouchMove,
    onTouchEnd: handleMainTouchEnd,
    onTouchCancel: handleMainTouchEnd,
    style: { touchAction: 'pan-y' as const },
  }), [handleMainTouchStart, handleMainTouchMove, handleMainTouchEnd]);

  return { overlayProps, sidebarProps, mainTouchProps };
}
