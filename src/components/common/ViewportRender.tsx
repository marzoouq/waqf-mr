import { useState, useEffect, useRef, type ReactNode } from 'react';

/**
 * يؤجّل تركيب المكوّن حتى يقترب من منطقة الرؤية (viewport).
 * يستخدم IntersectionObserver مع rootMargin لبدء التحميل قبل الوصول الفعلي.
 */
const ViewportRender = ({
  children,
  minHeight = 200,
  rootMargin = '200px',
}: {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
}) => {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // إذا كان المتصفح لا يدعم IntersectionObserver — نعرض مباشرة
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  if (visible) return <>{children}</>;

  return <div ref={ref} style={{ minHeight }} />;
};

export default ViewportRender;
