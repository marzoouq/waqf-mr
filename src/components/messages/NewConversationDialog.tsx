/**
 * حوار إنشاء محادثة جديدة
 */
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Label } from '@/components/ui/label';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beneficiaries: Array<{ user_id: string | null; name: string }>;
  beneficiaryId: string;
  setBeneficiaryId: (v: string) => void;
  subject: string;
  setSubject: (v: string) => void;
  onCreate: () => void;
}

export default function NewConversationDialog({
  open, onOpenChange, beneficiaries,
  beneficiaryId, setBeneficiaryId, subject, setSubject, onCreate,
}: NewConversationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-display">محادثة جديدة</DialogTitle>
          <DialogDescription className="sr-only">بدء محادثة جديدة مع مستفيد</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="msg-beneficiary">المستفيد</Label>
            <NativeSelect
              id="msg-beneficiary"
              value={beneficiaryId}
              onValueChange={setBeneficiaryId}
              placeholder="اختر المستفيد"
              options={beneficiaries.filter((b) => b.user_id).map((b) => ({ value: b.user_id!, label: b.name }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="msg-subject">الموضوع</Label>
            <Input id="msg-subject" name="newConvSubject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="موضوع المحادثة" maxLength={200} />
          </div>
          <Button onClick={onCreate} disabled={!beneficiaryId} className="w-full">
            بدء المحادثة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
