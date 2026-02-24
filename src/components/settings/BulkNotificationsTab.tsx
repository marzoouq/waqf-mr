/**
 * تبويب الإشعارات الجماعية
 * يتيح للناظر إرسال إشعارات مخصصة لجميع أو بعض المستفيدين
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, Megaphone, Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { notifyUser } from '@/utils/notifications';
import { useState } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

const BulkNotificationsTab = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [link, setLink] = useState('');
  const [target, setTarget] = useState<'all' | 'selected'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const { data: beneficiaries = [] } = useQuery({
    queryKey: ['beneficiaries-for-notify'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('id, name, user_id')
        .not('user_id', 'is', null)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const toggleBeneficiary = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('يرجى كتابة العنوان والرسالة');
      return;
    }

    setSending(true);
    try {
      if (target === 'all') {
        // Use the DB function to notify all beneficiaries
        const { error } = await supabase.rpc('notify_all_beneficiaries', {
          p_title: title.trim(),
          p_message: message.trim(),
          p_type: type,
          p_link: link.trim() || null,
        });
        if (error) throw error;
        toast.success(`تم إرسال الإشعار لجميع المستفيدين (${beneficiaries.length})`);
      } else {
        // Send to selected beneficiaries only
        const selectedBeneficiaries = beneficiaries.filter(b => selectedIds.includes(b.id));
        if (selectedBeneficiaries.length === 0) {
          toast.error('يرجى اختيار مستفيد واحد على الأقل');
          setSending(false);
          return;
        }
        for (const b of selectedBeneficiaries) {
          notifyUser(b.user_id!, title.trim(), message.trim(), type, link.trim() || undefined);
        }
        toast.success(`تم إرسال الإشعار لـ ${selectedBeneficiaries.length} مستفيد`);
      }
      // Reset form
      setTitle('');
      setMessage('');
      setLink('');
      setSelectedIds([]);
    } catch (err) {
      // Send notification error — toast handles user notification
      toast.error('حدث خطأ أثناء إرسال الإشعار');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            إرسال إشعار جماعي
          </CardTitle>
          <CardDescription>إرسال إشعارات مخصصة لجميع أو بعض المستفيدين</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>عنوان الإشعار *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: إشعار توزيع الأرباح" maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label>نوع الإشعار</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">ℹ️ معلومات</SelectItem>
                  <SelectItem value="success">✅ نجاح</SelectItem>
                  <SelectItem value="warning">⚠️ تحذير</SelectItem>
                  <SelectItem value="error">🔴 تنبيه</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>نص الإشعار *</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="اكتب نص الإشعار هنا..." rows={3} maxLength={500} />
          </div>

          <div className="space-y-1.5">
            <Label>رابط (اختياري)</Label>
            <Input value={link} onChange={e => setLink(e.target.value)} placeholder="/beneficiary/my-share" maxLength={200} />
          </div>

          <div className="space-y-3 border-t pt-4">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              المستهدفون
            </Label>
            <div className="flex gap-3">
              <Button
                variant={target === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTarget('all')}
              >
                جميع المستفيدين ({beneficiaries.length})
              </Button>
              <Button
                variant={target === 'selected' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTarget('selected')}
              >
                اختيار محدد
              </Button>
            </div>

            {target === 'selected' && (
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {beneficiaries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">لا يوجد مستفيدون مرتبطون بحسابات</p>
                ) : (
                  beneficiaries.map(b => (
                    <label key={b.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded">
                      <Checkbox
                        checked={selectedIds.includes(b.id)}
                        onCheckedChange={() => toggleBeneficiary(b.id)}
                      />
                      <span className="text-sm">{b.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          <Button onClick={handleSend} disabled={sending} className="w-full gap-2 mt-2">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'جارٍ الإرسال...' : 'إرسال الإشعار'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkNotificationsTab;
