/**
 * نافذة تأكيد قوية للتنظيف العميق — تعرض ما سيُحذف وما سيُحفظ
 * تتطلب كتابة كلمة "تأكيد" للمتابعة
 */
import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

interface Props {
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const WILL_DELETE = [
  'كاش TanStack Query (سيُعاد جلب البيانات)',
  'Service Worker الخاص بالتطبيق (PWA)',
  'Cache Storage (workbox / precache / runtime)',
  'IndexedDB غير الحرج (lovable-cache, localforage)',
  'نتائج وأرشيف التشخيص',
  'علامات التحذيرات المرفوضة',
  'قائمة انتظار أخطاء الإشعارات',
];

const WILL_KEEP = [
  'جلسة تسجيل الدخول (sb-* tokens)',
  'مُعرّف السنة المالية النشطة (fiscal_year_id)',
  'تفضيل الثيم واللغة',
  'Firebase Messaging Service Worker',
  'قواعد IndexedDB الخاصة بـ Supabase وFirebase',
  'كاش الإشعارات (firebase-* / fcm-*)',
];

const CONFIRM_WORD = 'تأكيد';

export default function DeepCleanConfirmDialog({ open, busy, onCancel, onConfirm }: Props) {
  const [text, setText] = useState('');
  const matched = text.trim() === CONFIRM_WORD;

  const handleOpenChange = (o: boolean) => {
    if (!o && !busy) {
      setText('');
      onCancel();
    }
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!matched || busy) return;
    setText('');
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent dir="rtl" className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            تنظيف عميق — تأكيد مطلوب
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
            <p className="font-medium text-warning-foreground">
              هذه عملية واسعة النطاق. ستُعاد تحميل الصفحة تلقائياً بعد ثانيتين من الإتمام.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-destructive">
                <XCircle className="w-4 h-4" />
                سيتم حذفه
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {WILL_DELETE.map((it) => (
                  <li key={it} className="flex items-start gap-1.5">
                    <span className="text-destructive mt-0.5">•</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-success/30 bg-success/5 p-3 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-success">
                <ShieldCheck className="w-4 h-4" />
                سيتم الاحتفاظ به
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {WILL_KEEP.map((it) => (
                  <li key={it} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-success mt-0.5 shrink-0" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-deep-clean" className="text-sm">
              اكتب كلمة <span className="font-bold text-foreground">«{CONFIRM_WORD}»</span> للمتابعة:
            </Label>
            <Input
              id="confirm-deep-clean"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={CONFIRM_WORD}
              disabled={busy}
              autoComplete="off"
              dir="rtl"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            disabled={!matched || busy}
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy ? 'جارٍ التنظيف...' : 'تنفيذ التنظيف العميق'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
