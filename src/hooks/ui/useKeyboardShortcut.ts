import { useEffect } from 'react';

type Modifier = 'ctrl' | 'meta' | 'ctrlOrMeta' | 'shift' | 'alt';

interface ShortcutOptions {
  key: string;
  modifier?: Modifier;
  preventDefault?: boolean;
}

/**
 * يستدعي handler عند ضغط اختصار لوحة مفاتيح.
 * Primitive عام — يدعم ctrlOrMeta لتلقائياً Cmd على macOS وCtrl على غيره.
 */
export function useKeyboardShortcut(
  { key, modifier, preventDefault = true }: ShortcutOptions,
  handler: (e: KeyboardEvent) => void,
): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      const modOk =
        !modifier ||
        (modifier === 'ctrl' && e.ctrlKey) ||
        (modifier === 'meta' && e.metaKey) ||
        (modifier === 'ctrlOrMeta' && (e.ctrlKey || e.metaKey)) ||
        (modifier === 'shift' && e.shiftKey) ||
        (modifier === 'alt' && e.altKey);
      if (!modOk) return;
      if (preventDefault) e.preventDefault();
      handler(e);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [key, modifier, preventDefault, handler]);
}
