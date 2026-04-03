/**
 * حوارات إنشاء محادثة/دعم فني — مكوّن فرعي من صفحة المراسلات
 */
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MessageDialogsProps {
  chatDialogOpen: boolean;
  setChatDialogOpen: (v: boolean) => void;
  chatSubject: string;
  setChatSubject: (v: string) => void;
  handleNewChat: () => void;

  supportDialogOpen: boolean;
  setSupportDialogOpen: (v: boolean) => void;
  supportSubject: string;
  setSupportSubject: (v: string) => void;
  handleNewSupport: () => void;

  isPending: boolean;
}

export default function MessageDialogs({
  chatDialogOpen, setChatDialogOpen, chatSubject, setChatSubject, handleNewChat,
  supportDialogOpen, setSupportDialogOpen, supportSubject, setSupportSubject, handleNewSupport,
  isPending,
}: MessageDialogsProps) {
  return (
    <>
      <Dialog open={chatDialogOpen} onOpenChange={setChatDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display">محادثة الناظر</DialogTitle>
            <DialogDescription>ابدأ محادثة جديدة مع ناظر الوقف</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="chat-subject">الموضوع</Label>
              <Input id="chat-subject" name="chatSubject" value={chatSubject} onChange={(e) => setChatSubject(e.target.value)} placeholder="موضوع المحادثة" maxLength={200} />
            </div>
            <Button onClick={handleNewChat} className="w-full" disabled={isPending}>
              {isPending ? 'جاري الإنشاء...' : 'بدء المحادثة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display">طلب دعم فني</DialogTitle>
            <DialogDescription>إرسال طلب دعم فني جديد</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="support-subject">الموضوع</Label>
              <Input id="support-subject" name="supportSubject" value={supportSubject} onChange={(e) => setSupportSubject(e.target.value)} placeholder="صف مشكلتك باختصار" maxLength={200} />
            </div>
            <Button onClick={handleNewSupport} className="w-full" disabled={isPending}>
              {isPending ? 'جاري الإرسال...' : 'إرسال طلب الدعم'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
