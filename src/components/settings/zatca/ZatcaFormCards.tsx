import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Cpu, Landmark, Radio } from 'lucide-react';
import { DEVICE_SERIAL_REGEX } from '@/utils/validation/index';

interface ZatcaFormCardsProps {
  formData: Record<string, string>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const ZatcaFormCards = ({ formData, setFormData }: ZatcaFormCardsProps) => {
  const updateField = (key: string, value: string) => {
    setFormData(p => ({ ...p, [key]: value }));
  };

  return (
    <>
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
            <Label htmlFor="zatca-company-name">اسم الشركة/المؤسسة <span className="text-destructive">*</span></Label>
            <p className="text-sm text-muted-foreground">يُقرأ من إعدادات الوقف (اسم الوقف)</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zatca-vat_registration_number">الرقم الضريبي (TIN) <span className="text-destructive">*</span></Label>
            <Input id="zatca-vat_registration_number" name="vat_registration_number" value={formData.vat_registration_number || ''} onChange={(e) => updateField('vat_registration_number', e.target.value)} placeholder="3XXXXXXXXXX0003" maxLength={15} dir="ltr" />
            <p className="text-xs text-muted-foreground">15 رقماً — يبدأ وينتهي بـ 3</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zatca-zatca_branch_name">اسم الفرع أو رقم المجموعة الضريبية</Label>
            <Input id="zatca-zatca_branch_name" name="zatca_branch_name" value={formData.zatca_branch_name || ''} onChange={(e) => updateField('zatca_branch_name', e.target.value)} placeholder="الفرع الرئيسي" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zatca-commercial_registration_number">السجل التجاري (CRN)</Label>
            <Input id="zatca-commercial_registration_number" name="commercial_registration_number" value={formData.commercial_registration_number || ''} onChange={(e) => updateField('commercial_registration_number', e.target.value)} placeholder="رقم السجل التجاري" dir="ltr" />
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
              <Label htmlFor={`zatca-${key}`}>{label}</Label>
              <Input id={`zatca-${key}`} name={key} value={formData[key] || ''} onChange={(e) => updateField(key, e.target.value)} placeholder={placeholder} dir={dir} />
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
            <Label htmlFor="zatca-zatca_activity_code">كود النشاط</Label>
            <Input id="zatca-zatca_activity_code" name="zatca_activity_code" value={formData.zatca_activity_code || ''} onChange={(e) => updateField('zatca_activity_code', e.target.value)} placeholder="مثال: 681001 — تأجير وإدارة العقارات المملوكة" dir="ltr" />
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
            <Label htmlFor="zatca-default_vat_rate">نسبة VAT الافتراضية</Label>
            <Select value={formData.default_vat_rate || '0'} onValueChange={(value) => updateField('default_vat_rate', value)}>
              <SelectTrigger id="zatca-default_vat_rate"><SelectValue /></SelectTrigger>
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
            <Label htmlFor="zatca-zatca_device_serial">معرّف الجهاز</Label>
            <Input id="zatca-zatca_device_serial" name="zatca_device_serial" value={formData.zatca_device_serial || ''} onChange={(e) => updateField('zatca_device_serial', e.target.value)} placeholder="1-WAQF|2-POS01|3-SN001" dir="ltr" className="font-mono" />
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
            <Label htmlFor="zatca-zatca_otp_1">رمز التفعيل OTP الأول <span className="text-destructive">*</span></Label>
            <Input id="zatca-zatca_otp_1" name="zatca_otp_1" value={formData.zatca_otp_1 || ''} onChange={(e) => updateField('zatca_otp_1', e.target.value)} placeholder="أدخل رمز OTP" dir="ltr" className="font-mono" maxLength={20} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zatca-zatca_otp_2">رمز التفعيل OTP الثاني</Label>
            <Input id="zatca-zatca_otp_2" name="zatca_otp_2" value={formData.zatca_otp_2 || ''} onChange={(e) => updateField('zatca_otp_2', e.target.value)} placeholder="اختياري — للأجهزة المتعددة" dir="ltr" className="font-mono" maxLength={20} />
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
            <Label htmlFor="zatca-waqf_bank_name">اسم البنك</Label>
            <Input id="zatca-waqf_bank_name" name="waqf_bank_name" value={formData.waqf_bank_name || ''} onChange={(e) => updateField('waqf_bank_name', e.target.value)} placeholder="مثال: البنك الأهلي السعودي" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zatca-waqf_bank_account">رقم الحساب</Label>
            <Input id="zatca-waqf_bank_account" name="waqf_bank_account" value={formData.waqf_bank_account || ''} onChange={(e) => updateField('waqf_bank_account', e.target.value)} placeholder="رقم الحساب البنكي" dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zatca-waqf_bank_iban">IBAN</Label>
            <Input id="zatca-waqf_bank_iban" name="waqf_bank_iban" value={formData.waqf_bank_iban || ''} onChange={(e) => updateField('waqf_bank_iban', e.target.value)} placeholder="SA00 0000 0000 0000 0000 0000" dir="ltr" className="font-mono" />
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default ZatcaFormCards;