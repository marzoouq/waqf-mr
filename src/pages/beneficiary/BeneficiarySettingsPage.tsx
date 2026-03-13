import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useBeneficiariesSafe } from '@/hooks/useBeneficiaries';
import { supabase } from '@/integrations/supabase/client';
import { getSafeErrorMessage } from '@/utils/safeErrorMessage';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';
import { User, Lock, Bell, Eye, EyeOff, Loader2, Shield, Palette, AlertCircle, RefreshCw, Volume2, Play } from 'lucide-react';
import { z } from 'zod';
import ThemeColorPicker from '@/components/ThemeColorPicker';
import BiometricSettings from '@/components/settings/BiometricSettings';
import { TableSkeleton } from '@/components/SkeletonLoaders';
import PageHeaderCard from '@/components/PageHeaderCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TONE_OPTIONS, NOTIFICATION_TONE_KEY, NOTIFICATION_VOLUME_KEY, VOLUME_OPTIONS, previewTone, type ToneId, type VolumeLevel } from '@/hooks/useNotifications';

const passwordSchema = z.object({
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmPassword'],
});

const NOTIF_PREFS_KEY = 'waqf_notification_preferences';
export { NOTIF_PREFS_KEY };
export const NOTIF_SOUND_KEY = 'waqf_notification_sound';

const defaultPrefs = {
  distributions: true,
  contracts: true,
  messages: true,
};

const BeneficiarySettingsPage = () => {
  const queryClient = useQueryClient();
  const handleRetry = useCallback(() => queryClient.invalidateQueries(), [queryClient]);
  const { user } = useAuth();
  const { data: beneficiaries = [], isLoading: benLoading, isError: benError } = useBeneficiariesSafe();
  const currentBeneficiary = beneficiaries.find(b => b.user_id === user?.id);

  // Password state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Notification preferences
  const [prefs, setPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem(NOTIF_PREFS_KEY);
      return stored ? { ...defaultPrefs, ...JSON.parse(stored) } : defaultPrefs;
    } catch {
      return defaultPrefs;
    }
  });

  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem(NOTIF_SOUND_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  const [selectedTone, setSelectedTone] = useState<ToneId>(() => {
    try {
      return (localStorage.getItem(NOTIFICATION_TONE_KEY) || 'chime') as ToneId;
    } catch {
      return 'chime';
    }
  });

  const [volume, setVolume] = useState<VolumeLevel>(() => {
    try {
      return (localStorage.getItem(NOTIFICATION_VOLUME_KEY) || 'medium') as VolumeLevel;
    } catch {
      return 'medium';
    }
  });

  const handleSoundChange = (value: boolean) => {
    setSoundEnabled(value);
    localStorage.setItem(NOTIF_SOUND_KEY, String(value));
    toast.success(value ? 'تم تفعيل صوت التنبيه' : 'تم تعطيل صوت التنبيه');
  };

  const handleToneChange = (tone: ToneId) => {
    setSelectedTone(tone);
    localStorage.setItem(NOTIFICATION_TONE_KEY, tone);
    const vol = VOLUME_OPTIONS.find(v => v.id === volume)?.gain ?? 0.5;
    previewTone(tone, vol);
  };

  const handleVolumeChange = (level: VolumeLevel) => {
    setVolume(level);
    localStorage.setItem(NOTIFICATION_VOLUME_KEY, level);
    const vol = VOLUME_OPTIONS.find(v => v.id === level)?.gain ?? 0.5;
    previewTone(selectedTone, vol);
  };

  const handlePrefChange = (key: keyof typeof defaultPrefs, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(updated));
    toast.success('تم حفظ التفضيلات');
  };

  const handlePasswordChange = async () => {
    setErrors({});
    const result = passwordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(e => {
        fieldErrors[e.path[0] as string] = e.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('تم تغيير كلمة المرور بنجاح');
      setPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      toast.error(getSafeErrorMessage(err));
    } finally {
      setPasswordLoading(false);
    }
  };

  // national_id مشفر في DB — نعرض قناع ثابت بدل slice من النص المشفر
  const maskedId = currentBeneficiary?.national_id
    ? '********'
    : '—';

  if (benError) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-bold">حدث خطأ أثناء تحميل البيانات</h2>
          <Button onClick={handleRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" /> إعادة المحاولة
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (benLoading) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6">
          <TableSkeleton rows={4} cols={2} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="الإعدادات"
          description="إدارة حسابك وتفضيلاتك"
          icon={User}
        />

        <Tabs defaultValue="account" dir="rtl" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 h-auto gap-1">
            <TabsTrigger value="account" className="gap-1.5 text-xs sm:text-sm py-2">
              <User className="w-4 h-4 hidden sm:block" />
              الحساب
            </TabsTrigger>
            <TabsTrigger value="password" className="gap-1.5 text-xs sm:text-sm py-2">
              <Lock className="w-4 h-4 hidden sm:block" />
              كلمة المرور
            </TabsTrigger>
            <TabsTrigger value="biometric" className="gap-1.5 text-xs sm:text-sm py-2">
              <Shield className="w-4 h-4 hidden sm:block" />
              البصمة
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 text-xs sm:text-sm py-2">
              <Bell className="w-4 h-4 hidden sm:block" />
              الإشعارات
            </TabsTrigger>
            <TabsTrigger value="theme" className="gap-1.5 text-xs sm:text-sm py-2">
              <Palette className="w-4 h-4 hidden sm:block" />
              المظهر
            </TabsTrigger>
          </TabsList>

          {/* Account Info Tab - removed share percentage */}
          <TabsContent value="account">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <User className="w-5 h-5" />
                  معلومات الحساب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs flex items-center gap-1">
                      <Lock className="w-3 h-3" /> الاسم
                    </Label>
                    <Input value={currentBeneficiary?.name || '—'} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">البريد الإلكتروني</Label>
                    <Input value={user?.email || '—'} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs flex items-center gap-1">
                      <Lock className="w-3 h-3" /> رقم الهوية
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input value={maskedId} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
                      <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  هذه المعلومات تُدار بواسطة ناظر الوقف. للتعديل يرجى التواصل عبر المراسلات.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Password Tab */}
          <TabsContent value="password">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Lock className="w-5 h-5" />
                  تغيير كلمة المرور
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="8 أحرف على الأقل"
                      className="pl-10"
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="أعد كتابة كلمة المرور"
                      className="pl-10"
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                </div>

                <Button onClick={handlePasswordChange} disabled={passwordLoading || !password} className="w-full sm:w-auto">
                  {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                  حفظ كلمة المرور
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Biometric Tab */}
          <TabsContent value="biometric">
            <BiometricSettings />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Bell className="w-5 h-5" />
                  تفضيلات الإشعارات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">إشعارات التوزيعات المالية</p>
                    <p className="text-xs text-muted-foreground">تنبيهات عند صرف التوزيعات</p>
                  </div>
                  <Switch checked={prefs.distributions} onCheckedChange={v => handlePrefChange('distributions', v)} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">إشعارات العقود</p>
                    <p className="text-xs text-muted-foreground">تنبيهات تجديد وانتهاء العقود</p>
                  </div>
                  <Switch checked={prefs.contracts} onCheckedChange={v => handlePrefChange('contracts', v)} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">إشعارات الرسائل</p>
                    <p className="text-xs text-muted-foreground">تنبيهات الرسائل الجديدة</p>
                  </div>
                  <Switch checked={prefs.messages} onCheckedChange={v => handlePrefChange('messages', v)} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium text-sm">صوت التنبيه</p>
                      <p className="text-xs text-muted-foreground">تشغيل صوت عند وصول إشعار جديد</p>
                    </div>
                  </div>
                  <Switch checked={soundEnabled} onCheckedChange={handleSoundChange} />
                </div>

                {soundEnabled && (
                  <>
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4 text-primary" />
                      <p className="font-medium text-sm">نغمة التنبيه</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select dir="rtl" value={selectedTone} onValueChange={(v) => handleToneChange(v as ToneId)}>
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TONE_OPTIONS.map(t => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => previewTone(selectedTone, VOLUME_OPTIONS.find(v => v.id === volume)?.gain)} aria-label="تشغيل النغمة">
                        <Play className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-primary" />
                      <p className="font-medium text-sm">مستوى الصوت</p>
                    </div>
                    <Select dir="rtl" value={volume} onValueChange={(v) => handleVolumeChange(v as VolumeLevel)}>
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VOLUME_OPTIONS.map(v => (
                          <SelectItem key={v.id} value={v.id} className="text-xs">{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Theme Tab */}
          <TabsContent value="theme">
            <ThemeColorPicker />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default BeneficiarySettingsPage;
