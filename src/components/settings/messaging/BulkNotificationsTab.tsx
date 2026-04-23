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
import { useState } from 'react';
import { defaultNotify } from '@/lib/notify';
import { useBulkNotifications } from '@/hooks/page/admin/management/useBulkNotifications';

const BulkNotificationsTab = () => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('info');
  const [link, setLink] = useState('');
  const [target, setTarget] = useState<'all' | 'selected'>('all');

  const {
    beneficiaries,
    message,
    setMessage,
    selectedBeneficiaries,
    toggleBeneficiary,
    handleSendNotifications,
    sending,
  } = useBulkNotifications();

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      defaultNotify.error('يرجى كتابة العنوان والرسالة');
      return;
    }

    await handleSendNotifications(title, message, type, link || null, target === 'all');
    setTitle('');
    setLink('');
    setTarget('all');
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
              <Label htmlFor="bulk-notifications-tab-field-1">عنوان الإشعار *</Label>
              <Input name="title" id="bulk-notifications-tab-field-1" value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: إشعار توزيع الأرباح" maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-notification-type">نوع الإشعار</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="bulk-notification-type">
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
            <Label htmlFor="bulk-notifications-tab-field-3">نص الإشعار *</Label>
            <Textarea id="bulk-notifications-tab-field-3" value={message} onChange={e => setMessage(e.target.value)} placeholder="اكتب نص الإشعار هنا..." rows={3} maxLength={500} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bulk-notifications-tab-field-4">رابط (اختياري)</Label>
            <Input name="link" id="bulk-notifications-tab-field-4" value={link} onChange={e => setLink(e.target.value)} placeholder="/beneficiary/my-share" maxLength={200} />
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
                        checked={selectedBeneficiaries.includes(b.id)}
                        onCheckedChange={() => toggleBeneficiary(b.id)}
                      />
                      <span className="text-sm">{b.name || 'بدون اسم'}</span>
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
