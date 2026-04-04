import { lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Send, X, Sparkles, Trash2, MessageSquare, BarChart3, FileText, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
const ReactMarkdown = lazy(() => import('react-markdown'));
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAiChat, type ChatMode } from '@/hooks/page/shared/useAiChat';

const MODE_CONFIG: Record<ChatMode, { label: string; icon: typeof Bot; placeholder: string; welcome: string }> = {
  chat: { label: 'محادثة', icon: MessageSquare, placeholder: 'اسأل المساعد الذكي...', welcome: 'اسألني عن أي شيء يتعلق بالوقف' },
  analysis: { label: 'تحليل مالي', icon: BarChart3, placeholder: 'اطلب تحليلاً مالياً...', welcome: 'اطلب تحليلاً مالياً للوقف وسأقدم لك رؤى تفصيلية' },
  report: { label: 'إعداد تقرير', icon: FileText, placeholder: 'اطلب إعداد تقرير...', welcome: 'اطلب إعداد تقرير وسأجهزه لك بصياغة احترافية' },
};

const AiAssistant = () => {
  const {
    user, isAvailable,
    open, setOpen, closePanel,
    messages, clearMessages,
    input, setInput,
    isLoading,
    mode, handleModeChange,
    send,
    endRef,
    error, retryLast,
  } = useAiChat();

  if (!isAvailable || !user) return null;

  const currentConfig = MODE_CONFIG[mode];
  const ModeIcon = currentConfig.icon;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-20 left-4 lg:bottom-4 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg gradient-primary hover:opacity-90 transition-[transform,opacity] duration-300 origin-bottom-left',
          open ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        )}
        size="icon"
      >
        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
      </Button>

      <div
        className={cn(
          'fixed inset-0 sm:inset-auto sm:bottom-20 sm:left-4 lg:sm:bottom-4 z-50 sm:w-[400px] sm:h-[560px] sm:rounded-2xl shadow-elegant border border-border bg-card flex flex-col overflow-hidden transition-all duration-300 origin-bottom-left',
          open ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        )}
      >
        {/* ── الشريط العلوي ── */}
        <div className="gradient-hero p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center"><Bot className="w-4 h-4 text-sidebar-foreground" /></div>
            <div>
              <p className="text-sm font-bold text-sidebar-foreground">المساعد الذكي</p>
              <p className="text-[11px] text-sidebar-foreground/60 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                {mode === 'analysis' ? 'Gemini 2.5 Pro' : 'Gemini 2.5 Flash'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent/50 h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>مسح المحادثة</AlertDialogTitle><AlertDialogDescription>هل أنت متأكد من مسح المحادثة؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter className="flex-row-reverse gap-2"><AlertDialogAction onClick={clearMessages}>مسح</AlertDialogAction><AlertDialogCancel>إلغاء</AlertDialogCancel></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent/50 h-8 w-8" onClick={closePanel}><X className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* ── المحادثة ── */}
        <div className="px-3 pt-2 pb-1 border-b border-border">
          <Tabs value={mode} onValueChange={handleModeChange}>
            <TabsList className="w-full h-8 p-0.5">
              {(Object.entries(MODE_CONFIG) as [ChatMode, typeof MODE_CONFIG['chat']][]).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <TabsTrigger key={key} value={key} className="flex-1 text-[11px] gap-1 h-7 data-[state=active]:shadow-sm" disabled={isLoading}>
                    <Icon className="w-3 h-3" />{cfg.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-1 p-3">
          {messages.length === 0 && !error && (
            <div className="text-center py-8 text-muted-foreground">
              <ModeIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">مرحباً! أنا المساعد الذكي لإدارة الوقف.</p>
              <p className="text-xs mt-1">{currentConfig.welcome}</p>
            </div>
          )}

          {/* ── واجهة بديلة عند فشل الاتصال ── */}
          {error && messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-destructive/10 flex items-center justify-center">
                <WifiOff className="w-7 h-7 text-destructive" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">تعذر الاتصال بالمساعد الذكي</p>
              <p className="text-xs text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={retryLast} className="gap-2">
                <RefreshCw className="w-3.5 h-3.5" />
                إعادة المحاولة
              </Button>
            </div>
          )}

          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <div key={`${msg.role}-${idx}-${msg.content.slice(0, 16)}`} className={cn('flex', msg.role === 'user' ? 'justify-start' : 'justify-end')}>
                <div className={cn('max-w-[85%] rounded-xl px-3 py-2 text-sm', msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0"><Suspense fallback={<span className="animate-pulse">...</span>}><ReactMarkdown>{msg.content}</ReactMarkdown></Suspense></div>
                  ) : <p>{msg.content}</p>}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-end"><div className="bg-muted rounded-xl px-4 py-2 text-sm"><span className="animate-pulse">يفكر...</span></div></div>
            )}
            <div ref={endRef} />
          </div>
        </ScrollArea>

        {/* ── شريط خطأ في أسفل المحادثة مع إمكانية إعادة المحاولة ── */}
        {error && messages.length > 0 && (
          <div className="px-3 py-2 bg-destructive/10 border-t border-destructive/20 flex items-center justify-between gap-2">
            <p className="text-xs text-destructive truncate">{error}</p>
            <Button variant="ghost" size="sm" onClick={retryLast} className="shrink-0 h-7 text-xs gap-1 text-destructive hover:text-destructive">
              <RefreshCw className="w-3 h-3" />
              إعادة
            </Button>
          </div>
        )}

        <div className="p-3 border-t border-border flex gap-2">
          <label htmlFor="ai-assistant-input" className="sr-only">اسأل المساعد الذكي</label>
          <Input id="ai-assistant-input" name="ai-assistant-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder={currentConfig.placeholder} maxLength={1000} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} disabled={isLoading} />
          <Button onClick={send} disabled={!input.trim() || isLoading} size="icon"><Send className="w-4 h-4" /></Button>
        </div>
      </div>
    </>
  );
};

export default AiAssistant;
