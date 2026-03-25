/**
 * تبويب الرسائل الجماعية
 * يتيح للناظر إرسال رسالة واحدة لجميع أو بعض المستفيدين عبر نظام المحادثات
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, MessageSquarePlus, Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { notifyUser } from '@/utils/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

const BulkMessagingTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | 'selected'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const { data: beneficiaries = [] } = useQuery({
    queryKey: ['beneficiaries-for-messaging'],
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
    if (!message.trim()) {
      toast.error('يرجى كتابة نص الرسالة');
      return;
    }
    if (!user) return;

    const recipients = target === 'all'
      ? beneficiaries
      : beneficiaries.filter(b => selectedIds.includes(b.id));

    if (recipients.length === 0) {
      toast.error('يرجى اختيار مستفيد واحد على الأقل');
      return;
    }

    setSending(true);
    try {
      const subjectText = subject.trim() || 'رسالة من ناظر الوقف';
      let successCount = 0;

      for (const b of recipients) {
        try {
          // إنشاء محادثة من نوع broadcast
          const { data: conv, error: convError } = await supabase
            .from('conversations')
            .insert({
              type: 'broadcast',
              subject: subjectText,
              created_by: user.id,
              participant_id: b.user_id,
            })
            .select()
            .single();

          if (convError) {
            logger.error('فشل إنشاء محادثة للمستفيد:', b.name, convError);
            continue;
          }

          // إرسال الرسالة
          const { error: msgError } = await supabase
            .from('messages')
            .insert({
              conversation_id: conv.id,
              sender_id: user.id,
              content: message.trim(),
            });

          if (msgError) {
            logger.error('فشل إرسال رسالة للمستفيد:', b.name, msgError);
            continue;
          }

          // إشعار المستفيد
          notifyUser(
            b.user_id!,
            'رسالة جديدة من ناظر الوقف',
            `لديك رسالة جديدة: "${subjectText}"`,
            'info',
            '/beneficiary/messages',
          );

          successCount++;
        } catch (err) {
          logger.error('خطأ أثناء إرسال رسالة للمستفيد:', b.name, err);
        }
      }

      if (successCount > 0) {
        toast.success(`تم إرسال الرسالة لـ ${successCount} مستفيد`);
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        // إعادة تعيين النموذج
        setSubject('');
        setMessage('');
        setSelectedIds([]);
      } else {
        toast.error('فشل إرسال الرسالة لجميع المستفيدين');
      }
    } catch {
      toast.error('حدث خطأ أثناء إرسال الرسائل');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5" />
            إرسال رسالة جماعية
          </CardTitle>
          <CardDescription>إرسال رسالة واحدة لجميع أو بعض المستفيدين عبر نظام المراسلات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>موضوع الرسالة</Label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="مثال: تحديث بشأن التوزيعات"
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label>نص الرسالة *</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="اكتب نص الرسالة هنا..."
              rows={4}
              maxLength={5000}
            />
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
            {sending ? 'جارٍ الإرسال...' : 'إرسال الرسالة'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkMessagingTab;
