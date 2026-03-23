/**
 * تبويب إعدادات ZATCA — الفاتورة الإلكترونية
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Save, FileText, Cpu, Landmark, ShieldCheck, CheckCircle, Loader2, Radio, Wifi, WifiOff, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useZatcaSettings } from '@/hooks/page/useZatcaSettings';
import ZatcaOperationsLog from './ZatcaOperationsLog';

const DEVICE_SERIAL_REGEX = /^1-.+\|2-.+\|3-.+$/;

const ZatcaSettingsTab = () => {
  const {
    isLoading, formData, setFormData, saving, onboardLoading,
    connectionTest, activeCert, isEnabled, selectedPhase, selectedPlatform,
    handleSave, handleSetupAndOnboard, handleTestConnection,
  } = useZatcaSettings();

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
                  {(['phase1', 'phase2'] as const).map((phase) => (
                    <label
                      key={phase}
                      className={cn(
                        'flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border transition-colors',
                        selectedPhase === phase ? 'border-primary bg-primary/5' : 'border-border'
                      )}
                    >
                      <input type="radio" name="zatca_phase" value={phase} checked={selectedPhase === phase} onChange={() => setFormData(p => ({ ...p, zatca_phase: phase }))} className="accent-primary" />
                      <div>
                        <p className="font-medium text-sm">{phase === 'phase1' ? 'المرحلة الأولى' : 'المرحلة الثانية'}</p>
                        <p className="text-xs text-muted-foreground">{phase === 'phase1' ? 'مرحلة الإصدار والحفظ' : 'مرحلة الربط والتكامل'}</p>
                      </div>
                    </label>
                  ))}
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
                  {([
                    { value: 'production', title: 'منصة فاتورة', desc: 'التهيئة لإصدار الفواتير الإلكترونية وإرسالها بشكل فعلي إلى الهيئة.' },
                    { value: 'sandbox', title: 'منصة محاكاة فاتورة', desc: 'التهيئة لتجربة الفواتير الإلكترونية وإرسالها بشكل تجريبي إلى منصة محاكاة فاتورة.' },
                  ] as const).map(({ value, title, desc }) => (
                    <div
                      key={value}
                      onClick={() => setFormData(p => ({ ...p, zatca_platform: value }))}
                      className={cn(
                        'cursor-pointer rounded-xl border-2 p-5 text-center transition-all hover:shadow-sm',
                        selectedPlatform === value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                      )}
                    >
                      {selectedPlatform === value && <CheckCircle className="w-5 h-5 text-primary mx-auto mb-2" />}
                      <p className="font-bold text-primary">{title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                    </div>
                  ))}
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
                {[
                  { key: 'business_address_street', label: 'الشارع', placeholder: 'اسم الشارع' },
                  { key: 'business_address_district', label: 'الحي', placeholder: 'اسم الحي' },
                  { key: 'business_address_city', label: 'المدينة', placeholder: 'المدينة' },
                  { key: 'business_address_postal_code', label: 'الرمز البريدي', placeholder: 'الرمز البريدي', dir: 'ltr' as const },
                  { key: 'business_address_building', label: 'رقم المبنى', placeholder: 'رقم المبنى', dir: 'ltr' as const },
                ].map(({ key, label, placeholder, dir }) => (
                  <div key={key} className="space-y-1.5">
                    <Label>{label}</Label>
                    <Input value={formData[key] || ''} onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} dir={dir} />
                  </div>
                ))}
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
