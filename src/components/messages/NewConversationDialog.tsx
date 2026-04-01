import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Label } from '@/components/ui/label';

interface Beneficiary {
  user_id?: string | null;
  name: string;
}

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beneficiaries: Beneficiary[];
  beneficiaryId: string;
  onBeneficiaryChange: (id: string) => void;
  subject: string;
  onSubjectChange: (s: string) => void;
  onSubmit: () => void;
}

const NewConversationDialog = ({
  open,
  onOpenChange,
  beneficiaries,
  beneficiaryId,
  onBeneficiaryChange,
  subject,
  onSubjectChange,
  onSubmit,
}: NewConversationDialogProps) => {
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
              onValueChange={onBeneficiaryChange}
              placeholder="اختر المستفيد"
              options={beneficiaries.filter((b) => b.user_id).map((b) => ({ value: b.user_id!, label: b.name }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="msg-subject">الموضوع</Label>
            <Input
              id="msg-subject"
              name="newConvSubject"
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              placeholder="موضوع المحادثة"
              maxLength={200}
            />
          </div>
          <Button onClick={onSubmit} disabled={!beneficiaryId} className="w-full">
            بدء المحادثة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewConversationDialog;
