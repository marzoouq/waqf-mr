/**
 * تبويب الرسائل الجماعية — يستخدم مكونات فرعية مستخرجة
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send, MessageSquarePlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { notifyUser } from '@/utils/notifications';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useState } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import RecipientSelector from './RecipientSelector';
import MessageComposer from './MessageComposer';

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
    if (!message.trim()) { toast.error('يرجى كتابة نص الرسالة'); return; }
    if (!user) return;

    const recipients = target === 'all'
      ? beneficiaries
      : beneficiaries.filter(b => selectedIds.includes(b.id));

    if (recipients.length === 0) { toast.error('يرجى اختيار مستفيد واحد على الأقل'); return; }

    setSending(true);
    try {
      const subjectText = subject.trim() || 'رسالة من ناظر الوقف';
      let successCount = 0;

      for (const b of recipients) {
        try {
          const { data: conv, error: convError } = await supabase
            .from('conversations')
            .insert({ type: 'broadcast', subject: subjectText, created_by: user.id, participant_id: b.user_id })
            .select().single();

          if (convError) { logger.error('فشل إنشاء محادثة للمستفيد:', b.name, convError); continue; }

          const { error: msgError } = await supabase
            .from('messages')
            .insert({ conversation_id: conv.id, sender_id: user.id, content: message.trim() });

          if (msgError) { logger.error('فشل إرسال رسالة للمستفيد:', b.name, msgError); continue; }

          notifyUser(b.user_id!, 'رسالة جديدة من ناظر الوقف', `لديك رسالة جديدة: "${subjectText}"`, 'info', '/beneficiary/messages');
          successCount++;
        } catch (err) {
          logger.error('خطأ أثناء إرسال رسالة للمستفيد:', b.name, err);
        }
      }

      if (successCount > 0) {
        toast.success(`تم إرسال الرسالة لـ ${successCount} مستفيد`);
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        setSubject(''); setMessage(''); setSelectedIds([]);
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
          <MessageComposer subject={subject} setSubject={setSubject} message={message} setMessage={setMessage} />
          <RecipientSelector
            beneficiaries={beneficiaries}
            target={target}
            setTarget={setTarget}
            selectedIds={selectedIds}
            toggleBeneficiary={toggleBeneficiary}
          />
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
