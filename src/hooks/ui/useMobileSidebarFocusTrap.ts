/**
 * useMobileSidebarFocusTrap — accessibility hook للوحة الجانبية على الجوال
 * يربط Escape للإغلاق + focus management + Tab trap دوري داخل drawer dialog.
 *
 * استُخرج من DashboardLayout للالتزام بحد 200 سطر.
 */
import { useEffect, useRef } from 'react';

export const useMobileSidebarFocusTrap = (
  isOpen: boolean,
  onClose: () => void,
) => {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>(
      'aside[role="dialog"][aria-label="القائمة الجانبية"]',
    );
    const getFocusable = () => Array.from(
      dialog?.querySelectorAll<HTMLElement>('a, button, [tabindex]:not([tabindex="-1"])') ?? [],
    ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
    const focusables = getFocusable();
    focusables[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const items = getFocusable();
        if (items.length === 0) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen, onClose]);
};
