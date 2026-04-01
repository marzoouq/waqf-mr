/**
 * مكوّن تأليف الرسالة الجماعية (الموضوع + النص)
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface MessageComposerProps {
  subject: string;
  setSubject: (v: string) => void;
  message: string;
  setMessage: (v: string) => void;
}

const MessageComposer = ({ subject, setSubject, message, setMessage }: MessageComposerProps) => (
  <>
    <div className="space-y-1.5">
      <Label htmlFor="bulk-messaging-tab-field-1">موضوع الرسالة</Label>
      <Input
        name="subject"
        id="bulk-messaging-tab-field-1"
        value={subject}
        onChange={e => setSubject(e.target.value)}
        placeholder="مثال: تحديث بشأن التوزيعات"
        maxLength={200}
      />
    </div>

    <div className="space-y-1.5">
      <Label htmlFor="bulk-messaging-tab-field-2">نص الرسالة *</Label>
      <Textarea
        id="bulk-messaging-tab-field-2"
        name="bulk_message"
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="اكتب نص الرسالة هنا..."
        rows={4}
        maxLength={5000}
      />
    </div>
  </>
);

export default MessageComposer;
