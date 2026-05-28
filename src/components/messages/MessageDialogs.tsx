/**
 * حوار إنشاء محادثة جديدة مع الناظر
 *
 * #B5/B7: أُزيل supportDialog — الدعم الفني له صفحة منفصلة عبر التذاكر.
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
  isPending: boolean;
}

export default function MessageDialogs({
  chatDialogOpen, setChatDialogOpen, chatSubject, setChatSubject, handleNewChat, isPending,
}: MessageDialogsProps) {
  return (
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
  );
}
