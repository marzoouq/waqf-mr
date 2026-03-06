import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Share, Plus, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallApp = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowRight className="w-4 h-4" />
          رجوع
        </Button>

        <Card className="shadow-elegant">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mb-3">
              <Smartphone className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-xl font-display">تثبيت التطبيق</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              ثبّت التطبيق على جوالك للوصول السريع والعمل بدون إنترنت
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {isInstalled ? (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
                <p className="font-bold text-lg">التطبيق مثبّت بالفعل!</p>
                <p className="text-sm text-muted-foreground">يمكنك فتحه من الشاشة الرئيسية لجوالك</p>
              </div>
            ) : deferredPrompt ? (
              <Button onClick={handleInstall} className="w-full h-12 gradient-primary text-base gap-2">
                <Download className="w-5 h-5" />
                تثبيت التطبيق الآن
              </Button>
            ) : isIOS ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-center">لتثبيت التطبيق على iPhone:</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Share className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-sm">1. اضغط على زر <strong>المشاركة</strong> في أسفل المتصفح</p>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Plus className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-sm">2. اختر <strong>إضافة إلى الشاشة الرئيسية</strong></p>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Download className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-sm">3. اضغط <strong>إضافة</strong> للتأكيد</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  افتح هذه الصفحة من متصفح الجوال (Chrome أو Safari) لتثبيت التطبيق
                </p>
              </div>
            )}

            {/* Features */}
            <div className="border-t pt-4 space-y-2">
              <p className="text-xs font-bold text-muted-foreground">مميزات التطبيق المثبّت:</p>
              {['وصول سريع من الشاشة الرئيسية', 'يعمل بدون إنترنت', 'إشعارات فورية بالتحديثات', 'تجربة كتطبيق أصلي'].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InstallApp;
