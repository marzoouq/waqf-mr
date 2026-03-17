import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Save, FileText, Cpu, Landmark, ShieldCheck, CheckCircle, Loader2, Radio, Wifi, WifiOff, History, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ZATCA_KEYS = [
  'vat_registration_number',
  'commercial_registration_number',
  'business_address_street',
  'business_address_city',
  'business_address_postal_code',
  'business_address_district',
  'business_address_building',
  'default_vat_rate',
  'zatca_device_serial',
  'zatca_enabled',
  'zatca_phase',
  'zatca_platform',
  'zatca_branch_name',
  'zatca_activity_code',
  'zatca_otp_1',
  'zatca_otp_2',
  'waqf_bank_name',
  'waqf_bank_account',
  'waqf_bank_iban',
] as const;

const DEVICE_SERIAL_REGEX = /^1-.+\|2-.+\|3-.+$/;

// ترجمة أنواع العمليات
const OPERATION_TYPE_LABELS: Record<string, string> = {
  'onboard': 'تهيئة وربط',
  'compliance-check': 'فحص امتثال',
  'production': 'شهادة إنتاج',
  'report': 'تبليغ فاتورة',
  'clearance': 'اعتماد فاتورة',
  'test-connection': 'اختبار اتصال',
};

// ─── مكون سجل العمليات ───
const ZatcaOperationsLog = () => {
  const [detailItem, setDetailItem] = useState<Record<string, unknown> | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['zatca-operation-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zatca_operation_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Array<{
        id: string;
        operation_type: string;
        status: string;
        request_summary: Record<string, unknown>;
        response_summary: Record<string, unknown>;
        error_message: string | null;
        invoice_id: string | null;
        user_id: string | null;
        created_at: string;
      }>;
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ تحميل السجل...</div>;

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد عمليات مسجلة بعد</p>
            <p className="text-sm mt-1">ستظهر هنا جميع عمليات التهيئة والربط مع ZATCA</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-5 h-5" />
            سجل العمليات ({logs.length})
          </CardTitle>
          <CardDescription>آخر 50 عملية مع بوابة فاتورة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">رسالة الخطأ</TableHead>
                  <TableHead className="text-right w-16">تفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {OPERATION_TYPE_LABELS[log.operation_type] || log.operation_type}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                        {log.status === 'success' ? '✅ نجح' : '❌ فشل'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}
                    </TableCell>
                    <TableCell className="text-sm text-destructive max-w-[200px] truncate">
                      {log.error_message || '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetailItem({
                          نوع_العملية: OPERATION_TYPE_LABELS[log.operation_type] || log.operation_type,
                          الحالة: log.status === 'success' ? 'نجح' : 'فشل',
                          التاريخ: new Date(log.created_at).toLocaleString('ar-SA'),
                          ملخص_الطلب: log.request_summary,
                          ملخص_الرد: log.response_summary,
                          رسالة_الخطأ: log.error_message || 'لا يوجد',
                          معرف_الفاتورة: log.invoice_id || 'لا يوجد',
                        })}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* حوار التفاصيل */}
      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل العملية</DialogTitle>
          </DialogHeader>
          <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto whitespace-pre-wrap font-mono" dir="ltr">
            {JSON.stringify(detailItem, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
};

const ZatcaSettingsTab = () => {
  const { data: settings, isLoading } = useAppSettings();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [connectionTest, setConnectionTest] = useState<{
    loading: boolean;
    result: null | { connected: boolean; url?: string; error?: string; tested_at?: string; status_code?: number };
  }>({ loading: false, result: null });

  const { data: certificates = [] } = useQuery({
    queryKey: ['zatca-certificates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('zatca_certificates').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const activeCert = certificates.find(c => c.is_active);
  const isEnabled = formData.zatca_enabled === 'true';
  const selectedPhase = formData.zatca_phase || 'phase2';
  const selectedPlatform = formData.zatca_platform || 'production';

  useEffect(() => {
    if (settings) {
      const initial: Record<string, string> = {};
      for (const key of ZATCA_KEYS) {
        initial[key] = settings[key] || '';
      }
      setFormData(initial);
    }
  }, [settings]);

  const handleSave = async () => {
    const vatNum = formData.vat_registration_number?.trim();
    if (vatNum && vatNum.length > 0) {
      if (!/^\d{15}$/.test(vatNum)) {
        toast.error('الرقم الضريبي يجب أن يكون 15 رقماً');
        return;
      }
      if (!vatNum.startsWith('3') || !vatNum.endsWith('3')) {
        toast.error('الرقم الضريبي يجب أن يبدأ وينتهي بالرقم 3');
        return;
      }
    }

    const serial = formData.zatca_device_serial?.trim();
    if (serial && serial.length > 0 && !DEVICE_SERIAL_REGEX.test(serial)) {
      toast.error('صيغة معرّف الجهاز غير صحيحة. الصيغة المطلوبة: 1-XXX|2-YYY|3-ZZZ');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const rows = ZATCA_KEYS.map((key) => ({
        key,
        value: (formData[key] || '').trim(),
        updated_at: now,
      }));
      const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      queryClient.invalidateQueries({ queryKey: ['waqf-info'] });
      toast.success('تم حفظ إعدادات الضريبة بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleSetupAndOnboard = async () => {
    const requiredFields: { key: string; label: string }[] = [
      { key: 'vat_registration_number', label: 'الرقم الضريبي' },
      { key: 'zatca_device_serial', label: 'معرّف الجهاز' },
    ];
    const missing = requiredFields.filter(f => !formData[f.key]?.trim());
    if (missing.length > 0) {
      toast.error(`يجب تعيين: ${missing.map(f => f.label).join('، ')}`);
      return;
    }
    const otp1 = formData.zatca_otp_1?.trim();
    if (!otp1) {
      toast.error('رمز التفعيل OTP الأول مطلوب لبدء التهيئة');
      return;
    }

    setOnboardLoading(true);
    try {
      await handleSave();
      const { error } = await supabase.functions.invoke('zatca-api', { body: { action: 'onboard' } });
      if (error) throw error;
      toast.success('تم التسجيل بنجاح في بوابة فاتورة');
      queryClient.invalidateQueries({ queryKey: ['zatca-certificates'] });
      queryClient.invalidateQueries({ queryKey: ['zatca-operation-log'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل التسجيل');
    } finally {
      setOnboardLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setConnectionTest({ loading: true, result: null });
    try {
      const { data, error } = await supabase.functions.invoke('zatca-api', {
        body: { action: 'test-connection' },
      });
      if (error) throw error;
      setConnectionTest({ loading: false, result: data });
      queryClient.invalidateQueries({ queryKey: ['zatca-operation-log'] });
      if (data?.connected) {
        toast.success('✅ الاتصال ببوابة فاتورة ناجح');
      } else {
        toast.error('❌ تعذّر الاتصال ببوابة فاتورة');
      }
    } catch (e) {
      setConnectionTest({
        loading: false,
        result: { connected: false, error: e instanceof Error ? e.message : 'خطأ غير معروف' },
      });
      toast.error('فشل اختبار الاتصال');
    }
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <div className="space-y-6">
      {/* ─── تفعيل الفاتورة الإلكترونية ─── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">تفعيل الفاتورة الإلكترونية السعودية</p>
                <p className="text-sm text-muted-foreground">هيئة الزكاة والضريبة والجمارك (ZATCA)</p>
              </div>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) => setFormData(p => ({ ...p, zatca_enabled: String(checked) }))}
            />
          </div>
        </CardContent>
      </Card>

      {isEnabled && (
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="settings" className="flex-1 gap-2">
              <ShieldCheck className="w-4 h-4" />
              الإعدادات
            </TabsTrigger>
            <TabsTrigger value="log" className="flex-1 gap-2">
              <History className="w-4 h-4" />
              سجل العمليات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="mt-4">
            <ZatcaOperationsLog />
          </TabsContent>

          <TabsContent value="settings" className="mt-4 space-y-6">
            {/* ─── اختيار المرحلة ─── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">مرحلة التطبيق</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-4">
                  <label
                    className={cn(
                      'flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border transition-colors',
                      selectedPhase === 'phase1' ? 'border-primary bg-primary/5' : 'border-border'
                    )}
                  >
                    <input type="radio" name="zatca_phase" value="phase1" checked={selectedPhase === 'phase1'} onChange={() => setFormData(p => ({ ...p, zatca_phase: 'phase1' }))} className="accent-primary" />
                    <div>
                      <p className="font-medium text-sm">المرحلة الأولى</p>
                      <p className="text-xs text-muted-foreground">مرحلة الإصدار والحفظ</p>
                    </div>
                  </label>
                  <label
                    className={cn(
                      'flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border transition-colors',
                      selectedPhase === 'phase2' ? 'border-primary bg-primary/5' : 'border-border'
                    )}
                  >
                    <input type="radio" name="zatca_phase" value="phase2" checked={selectedPhase === 'phase2'} onChange={() => setFormData(p => ({ ...p, zatca_phase: 'phase2' }))} className="accent-primary" />
                    <div>
                      <p className="font-medium text-sm">المرحلة الثانية</p>
                      <p className="text-xs text-muted-foreground">مرحلة الربط والتكامل</p>
                    </div>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* ─── اختيار المنصة ─── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">المنصة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => setFormData(p => ({ ...p, zatca_platform: 'production' }))}
                    className={cn(
                      'cursor-pointer rounded-xl border-2 p-5 text-center transition-all hover:shadow-sm',
                      selectedPlatform === 'production' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                    )}
                  >
                    {selectedPlatform === 'production' && <CheckCircle className="w-5 h-5 text-primary mx-auto mb-2" />}
                    <p className="font-bold text-primary">منصة فاتورة</p>
                    <p className="text-xs text-muted-foreground mt-1">التهيئة لإصدار الفواتير الإلكترونية وإرسالها بشكل فعلي إلى الهيئة.</p>
                  </div>
                  <div
                    onClick={() => setFormData(p => ({ ...p, zatca_platform: 'sandbox' }))}
                    className={cn(
                      'cursor-pointer rounded-xl border-2 p-5 text-center transition-all hover:shadow-sm',
                      selectedPlatform === 'sandbox' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                    )}
                  >
                    {selectedPlatform === 'sandbox' && <CheckCircle className="w-5 h-5 text-primary mx-auto mb-2" />}
                    <p className="font-bold text-primary">منصة محاكاة فاتورة</p>
                    <p className="text-xs text-muted-foreground mt-1">التهيئة لتجربة الفواتير الإلكترونية وإرسالها بشكل تجريبي إلى منصة محاكاة فاتورة.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ─── حالة ربط API ─── */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  {connectionTest.result?.connected ? <Wifi className="w-5 h-5 text-primary" /> : <WifiOff className="w-5 h-5 text-muted-foreground" />}
                  حالة ربط API
                </CardTitle>
                <CardDescription>اختبار الاتصال ببوابة فاتورة الإلكترونية</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm text-muted-foreground mb-1">بوابة API الحالية:</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded block font-mono" dir="ltr">
                      {selectedPlatform === 'production'
                        ? 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal'
                        : 'https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation'}
                    </code>
                  </div>
                  <Button variant="outline" onClick={handleTestConnection} disabled={connectionTest.loading} className="gap-2">
                    {connectionTest.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : connectionTest.result?.connected ? <Wifi className="w-4 h-4 text-primary" /> : <WifiOff className="w-4 h-4" />}
                    {connectionTest.loading ? 'جارٍ الاختبار...' : 'اختبار الاتصال'}
                  </Button>
                </div>
                {connectionTest.result && (
                  <div className={cn(
                    'flex items-center gap-2 p-3 rounded-lg border text-sm',
                    connectionTest.result.connected ? 'bg-primary/5 border-primary/30 text-primary' : 'bg-destructive/5 border-destructive/30 text-destructive'
                  )}>
                    {connectionTest.result.connected ? <CheckCircle className="w-4 h-4 shrink-0" /> : <WifiOff className="w-4 h-4 shrink-0" />}
                    <div>
                      <p className="font-medium">{connectionTest.result.connected ? 'متصل بنجاح' : 'تعذّر الاتصال'}</p>
                      {connectionTest.result.error && <p className="text-xs mt-0.5">{connectionTest.result.error}</p>}
                      {connectionTest.result.tested_at && (
                        <p className="text-xs text-muted-foreground mt-0.5">آخر اختبار: {new Date(connectionTest.result.tested_at).toLocaleString('ar-SA')}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ─── بيانات المنشأة ─── */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  بيانات المنشأة
                </CardTitle>
                <CardDescription>بيانات ZATCA المطلوبة لإصدار الفواتير الإلكترونية المتوافقة</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>اسم الشركة/المؤسسة <span className="text-destructive">*</span></Label>
                  <p className="text-sm text-muted-foreground">يُقرأ من إعدادات الوقف (اسم الوقف)</p>
                </div>
                <div className="space-y-1.5">
                  <Label>الرقم الضريبي (TIN) <span className="text-destructive">*</span></Label>
                  <Input value={formData.vat_registration_number || ''} onChange={(e) => setFormData((p) => ({ ...p, vat_registration_number: e.target.value }))} placeholder="3XXXXXXXXXX0003" maxLength={15} dir="ltr" />
                  <p className="text-xs text-muted-foreground">15 رقماً — يبدأ وينتهي بـ 3</p>
                </div>
                <div className="space-y-1.5">
                  <Label>اسم الفرع أو رقم المجموعة الضريبية</Label>
                  <Input value={formData.zatca_branch_name || ''} onChange={(e) => setFormData((p) => ({ ...p, zatca_branch_name: e.target.value }))} placeholder="الفرع الرئيسي" />
                </div>
                <div className="space-y-1.5">
                  <Label>السجل التجاري (CRN)</Label>
                  <Input value={formData.commercial_registration_number || ''} onChange={(e) => setFormData((p) => ({ ...p, commercial_registration_number: e.target.value }))} placeholder="رقم السجل التجاري" dir="ltr" />
                </div>
              </CardContent>
            </Card>

            {/* ─── عنوان المنشأة ─── */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">العنوان المسجل <span className="text-destructive">*</span></CardTitle>
                <CardDescription>العنوان المطلوب في الفواتير الضريبية</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>الشارع</Label>
                  <Input value={formData.business_address_street || ''} onChange={(e) => setFormData((p) => ({ ...p, business_address_street: e.target.value }))} placeholder="اسم الشارع" />
                </div>
                <div className="space-y-1.5">
                  <Label>الحي</Label>
                  <Input value={formData.business_address_district || ''} onChange={(e) => setFormData((p) => ({ ...p, business_address_district: e.target.value }))} placeholder="اسم الحي" />
                </div>
                <div className="space-y-1.5">
                  <Label>المدينة</Label>
                  <Input value={formData.business_address_city || ''} onChange={(e) => setFormData((p) => ({ ...p, business_address_city: e.target.value }))} placeholder="المدينة" />
                </div>
                <div className="space-y-1.5">
                  <Label>الرمز البريدي</Label>
                  <Input value={formData.business_address_postal_code || ''} onChange={(e) => setFormData((p) => ({ ...p, business_address_postal_code: e.target.value }))} placeholder="الرمز البريدي" dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <Label>رقم المبنى</Label>
                  <Input value={formData.business_address_building || ''} onChange={(e) => setFormData((p) => ({ ...p, business_address_building: e.target.value }))} placeholder="رقم المبنى" dir="ltr" />
                </div>
              </CardContent>
            </Card>

            {/* ─── تصنيف النشاط ─── */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">تصنيف النشاط <span className="text-destructive">*</span></CardTitle>
                <CardDescription>كود ISIC الخاص بنشاط المنشأة</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 max-w-md">
                  <Input value={formData.zatca_activity_code || ''} onChange={(e) => setFormData((p) => ({ ...p, zatca_activity_code: e.target.value }))} placeholder="مثال: 681001 — تأجير وإدارة العقارات المملوكة" dir="ltr" />
                  <p className="text-xs text-muted-foreground">كود التصنيف الدولي ISIC — لنشاط التأجير العقاري عادةً: <code className="bg-muted px-1 rounded">681001</code></p>
                </div>
              </CardContent>
            </Card>

            {/* ─── إعدادات الضريبة ─── */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">إعدادات الضريبة</CardTitle>
                <CardDescription>نسبة ضريبة القيمة المضافة الافتراضية على الفواتير الجديدة</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 max-w-xs">
                  <Label>نسبة VAT الافتراضية</Label>
                  <Select value={formData.default_vat_rate || '0'} onValueChange={(value) => setFormData((p) => ({ ...p, default_vat_rate: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0% — معفاة</SelectItem>
                      <SelectItem value="15">15% — خاضعة</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">الأوقاف السكنية عادةً معفاة (0%)، التجارية خاضعة (15%)</p>
                </div>
              </CardContent>
            </Card>

            {/* ─── معرّف الجهاز ─── */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Cpu className="w-5 h-5" />
                  معرّف الجهاز (Device Serial) <span className="text-destructive">*</span>
                </CardTitle>
                <CardDescription>معرّف فريد للحل التقني يُستخدم عند تسجيل الشهادة مع ZATCA</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 max-w-md">
                  <Input value={formData.zatca_device_serial || ''} onChange={(e) => setFormData((p) => ({ ...p, zatca_device_serial: e.target.value }))} placeholder="1-WAQF|2-POS01|3-SN001" dir="ltr" className="font-mono" />
                  <p className="text-xs text-muted-foreground">الصيغة: <code className="bg-muted px-1 rounded">1-اسم_المزود|2-الموديل|3-الرقم_التسلسلي</code></p>
                  {formData.zatca_device_serial && !DEVICE_SERIAL_REGEX.test(formData.zatca_device_serial.trim()) && (
                    <p className="text-xs text-destructive">⚠️ الصيغة غير صحيحة</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ─── رموز التفعيل OTP ─── */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Radio className="w-5 h-5" />
                  رموز التفعيل OTP
                </CardTitle>
                <CardDescription>أدخل رموز OTP من بوابة فاتورة لإتمام عملية التهيئة والربط</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>رمز التفعيل OTP الأول <span className="text-destructive">*</span></Label>
                  <Input value={formData.zatca_otp_1 || ''} onChange={(e) => setFormData((p) => ({ ...p, zatca_otp_1: e.target.value }))} placeholder="أدخل رمز OTP" dir="ltr" className="font-mono" maxLength={20} />
                </div>
                <div className="space-y-1.5">
                  <Label>رمز التفعيل OTP الثاني</Label>
                  <Input value={formData.zatca_otp_2 || ''} onChange={(e) => setFormData((p) => ({ ...p, zatca_otp_2: e.target.value }))} placeholder="اختياري — للأجهزة المتعددة" dir="ltr" className="font-mono" maxLength={20} />
                </div>
                <div className="md:col-span-2">
                  <a href="https://fatoora.zatca.gov.sa/" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    كيفية الحصول على رموز التفعيل OTP؟
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* ─── الحساب البنكي ─── */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Landmark className="w-5 h-5" />
                  بيانات الحساب البنكي
                </CardTitle>
                <CardDescription>تظهر في الفواتير لتسهيل عملية الدفع</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>اسم البنك</Label>
                  <Input value={formData.waqf_bank_name || ''} onChange={(e) => setFormData((p) => ({ ...p, waqf_bank_name: e.target.value }))} placeholder="مثال: البنك الأهلي السعودي" />
                </div>
                <div className="space-y-1.5">
                  <Label>رقم الحساب</Label>
                  <Input value={formData.waqf_bank_account || ''} onChange={(e) => setFormData((p) => ({ ...p, waqf_bank_account: e.target.value }))} placeholder="رقم الحساب البنكي" dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <Label>IBAN</Label>
                  <Input value={formData.waqf_bank_iban || ''} onChange={(e) => setFormData((p) => ({ ...p, waqf_bank_iban: e.target.value }))} placeholder="SA00 0000 0000 0000 0000 0000" dir="ltr" className="font-mono" />
                </div>
              </CardContent>
            </Card>

            {/* ─── حالة الشهادة الحالية ─── */}
            {activeCert && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">شهادة {activeCert.certificate_type === 'production' ? 'إنتاج' : 'امتثال'} نشطة</p>
                      <p className="text-sm text-muted-foreground">
                        معرّف الطلب: <span className="font-mono">{activeCert.request_id || '—'}</span>
                        {' • '}
                        {activeCert.created_at ? new Date(activeCert.created_at).toLocaleDateString('ar-SA') : ''}
                      </p>
                    </div>
                    <Badge variant={activeCert.certificate_type === 'production' ? 'default' : 'secondary'} className="mr-auto">
                      {activeCert.certificate_type === 'production' ? 'إنتاج' : 'امتثال'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* ─── أزرار الإجراءات ─── */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="default" disabled={onboardLoading} className="gap-2 bg-primary">
                    {onboardLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    تهيئة
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>⚠️ بدء عملية التهيئة والربط مع فاتورة</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>سيتم حفظ جميع الإعدادات وتوليد شهادة ZATCA جديدة وإرسال طلب التسجيل.</p>
                      <p>تأكد من إدخال رمز OTP صحيح من بوابة فاتورة.</p>
                      {activeCert && (
                        <p className="text-destructive font-medium">⚠️ سيتم إلغاء الشهادة النشطة الحالية واستبدالها.</p>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSetupAndOnboard}>تأكيد التهيئة</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default ZatcaSettingsTab;
