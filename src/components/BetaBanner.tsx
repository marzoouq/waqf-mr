import { useState } from "react";
import { FlaskConical, X } from "lucide-react";

const BetaBanner = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="sticky top-0 z-[100] flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-white text-sm font-medium shadow-md print:hidden">
      <FlaskConical className="h-4 w-4 shrink-0" />
      <span>نسخة تجريبية (Beta) — جاري العمل على التحسينات</span>
      <button
        onClick={() => setDismissed(true)}
        className="mr-2 rounded p-0.5 hover:bg-amber-600 transition-colors"
        aria-label="إغلاق"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default BetaBanner;
