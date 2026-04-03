/**
 * تبويب الرسائل الجماعية
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, MessageSquarePlus, Loader2, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useBeneficiariesForMessaging, useBulkMessageSender } from '@/hooks/data/useBulkMessaging';

const BulkMessagingTab = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | 'selected'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: beneficiaries = [] } = useBeneficiariesForMessaging();
  const { sendBulkMessage, sending } = useBulkMessageSender();

  const toggleBeneficiary = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSend = async () => {
    if (!message.trim()) { toast.error('يرجى كتابة نص الرسالة'); return; }

    const recipients = target === 'all'
      ? beneficiaries
      : beneficiaries.filter(b => selectedIds.includes(b.id));

    if (recipients.length === 0) { toast.error('يرجى اختيار مستفيد واحد على الأقل'); return; }

    const successCount = await sendBulkMessage(recipients, subject, message);
    if (successCount > 0) {
      setSubject('');
      setMessage('');
      setSelectedIds([]);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2"><MessageSquarePlus className="w-5 h-5" />إرسال رسالة جماعية</CardTitle>
          <CardDescription>إرسال رسالة واحدة لجميع أو بعض المستفيدين عبر نظام المراسلات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-messaging-tab-field-1">موضوع الرسالة</Label>
            <Input name="subject" id="bulk-messaging-tab-field-1" value={subject} onChange={e => setSubject(e.target.value)} placeholder="مثال: تحديث بشأن التوزيعات" maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bulk-messaging-tab-field-2">نص الرسالة *</Label>
            <Textarea id="bulk-messaging-tab-field-2" value={message} onChange={e => setMessage(e.target.value)} placeholder="اكتب نص الرسالة هنا..." rows={4} maxLength={5000} />
          </div>
          <div className="space-y-3 border-t pt-4">
            <Label className="flex items-center gap-2"><Users className="w-4 h-4" />المستهدفون</Label>
            <div className="flex gap-3">
              <Button variant={target === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setTarget('all')}>جميع المستفيدين ({beneficiaries.length})</Button>
              <Button variant={target === 'selected' ? 'default' : 'outline'} size="sm" onClick={() => setTarget('selected')}>اختيار محدد</Button>
            </div>
            {target === 'selected' && (
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {beneficiaries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">لا يوجد مستفيدون مرتبطون بحسابات</p>
                ) : beneficiaries.map(b => (
                  <label key={b.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded">
                    <Checkbox checked={selectedIds.includes(b.id)} onCheckedChange={() => toggleBeneficiary(b.id)} />
                    <span className="text-sm">{b.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <Button onClick={handleSend} disabled={sending} className="w-full gap-2 mt-2">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'جارٍ الإرسال...' : 'إرسال الرسالة'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkMessagingTab;
