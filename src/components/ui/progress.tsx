import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/cn";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("relative h-4 w-full overflow-hidden rounded-full bg-muted", className)}
    {...props}
  >
    {/* العرض بدل الإزاحة: يمتلئ الشريط من بداية السطر (اليمين في العربية) */}
    <ProgressPrimitive.Indicator
      className="h-full bg-primary transition-all"
      style={{ width: `${Math.min(100, Math.max(0, value || 0))}%` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
