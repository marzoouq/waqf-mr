import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ConnectionTestResult {
  connected: boolean;
  error?: string;
  tested_at?: string;
}

interface ZatcaConnectionStatusProps {
  selectedPlatform: string;
  connectionTest: {
    loading: boolean;
    result: ConnectionTestResult | null;
  };
  onTestConnection: () => void;
}

const ZatcaConnectionStatus = ({ selectedPlatform, connectionTest, onTestConnection }: ZatcaConnectionStatusProps) => {
  return (
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
          <Button variant="outline" onClick={onTestConnection} disabled={connectionTest.loading} className="gap-2">
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
  );
};

export default ZatcaConnectionStatus;
