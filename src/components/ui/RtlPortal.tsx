/**
 * RtlPortal — غلاف خفيف لتطبيق `dir="rtl"` داخل Portals (Dialog/Popover/Sheet)
 *
 * المشكلة: Radix Portal يخرج من شجرة DOM ويفقد الميراث `dir` من <html>.
 * الحل: غلّف children بـ <div dir="rtl"> لإعادة تثبيت الاتجاه.
 *
 * ملاحظة: لا يضيف عناصر دلالية — مجرد `div` لتمرير `dir`.
 */
import type { ReactNode, HTMLAttributes } from 'react';

interface RtlPortalProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const RtlPortal = ({ children, dir = 'rtl', ...rest }: RtlPortalProps) => {
  return (
    <div dir={dir} {...rest}>
      {children}
    </div>
  );
};

export default RtlPortal;
