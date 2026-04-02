/**
 * يُرجع true إذا كانت الشاشة بعرض ≥ 768px (md breakpoint).
 * يتسق مع Tailwind md: breakpoint.
 */
import { useState, useEffect } from 'react';

const MD_BREAKPOINT = 768;

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= MD_BREAKPOINT);

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${MD_BREAKPOINT}px)`);
    const onChange = () => setIsDesktop(window.innerWidth >= MD_BREAKPOINT);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}
