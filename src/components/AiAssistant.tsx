import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Send, X, Sparkles, Trash2, MessageSquare, BarChart3, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const AI_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/ai-assistant` : null;

type Msg = { role: 'user' | 'assistant'; content: string };
type ChatMode = 'chat' | 'analysis' | 'report';

const MODE_CONFIG: Record<ChatMode, { label: string; icon: typeof Bot; placeholder: string; welcome: string }> = {
  chat: { label: 'محادثة', icon: MessageSquare, placeholder: 'اسأل المساعد الذكي...', welcome: 'اسألني عن أي شيء يتعلق بالوقف' },
  analysis: { label: 'تحليل مالي', icon: BarChart3, placeholder: 'اطلب تحليلاً مالياً...', welcome: 'اطلب تحليلاً مالياً للوقف وسأقدم لك رؤى تفصيلية' },
  report: { label: 'إعداد تقرير', icon: FileText, placeholder: 'اطلب إعداد تقرير...', welcome: 'اطلب إعداد تقرير وسأجهزه لك بصياغة احترافية' },
};

const SEND_COOLDOWN_MS = 2000;

const AiAssistant = () => {
  const { user, role } = useAuth();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>('chat');
  const lastSendTimeRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  // المساعد الذكي متاح لجميع الأدوار المسجلة
  if (role !== 'admin' && role !== 'accountant' && role !== 'beneficiary' && role !== 'waqif') return null;

  const handleModeChange = (newMode: string) => {
    if (newMode === mode) return;
    abortControllerRef.current?.abort();
    setMode(newMode as ChatMode);
    setMessages([]);
    setIsLoading(false);
  };

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    if (!AI_URL) {
      setMessages(prev => [...prev, { role: 'user', content: trimmed }, { role: 'assistant', content: '❌ خطأ في إعداد المساعد الذكي — تعذر الاتصال بالخادم.' }]);
      setInput('');
      return;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const userMsg: Msg = { role: 'user', content: trimmed };
    const HISTORY_LIMIT = 10;
    const allMessages = [...messages, userMsg].slice(-HISTORY_LIMIT);
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      // تحديث الجلسة لضمان صلاحية الـ token
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) {
        throw new Error('يجب تسجيل الدخول لاستخدام المساعد الذكي');
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        throw new Error('انتهت صلاحية الجلسة — يرجى تسجيل الدخول مجدداً');
      }

      const resp = await fetch(AI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: allMessages, mode }),
        signal: abortControllerRef.current.signal,
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'فشل الاتصال بالمساعد الذكي');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ ${e instanceof Error ? e.message : 'حدث خطأ'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  const currentConfig = MODE_CONFIG[mode];
  const ModeIcon = currentConfig.icon;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-20 left-4 lg:bottom-4 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg gradient-primary hover:opacity-90 transition-all duration-300 origin-bottom-left',
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
        {/* Header */}
        <div className="gradient-hero p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center">
              <Bot className="w-4 h-4 text-sidebar-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-sidebar-foreground">المساعد الذكي</p>
              <p className="text-[10px] text-sidebar-foreground/60 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                {mode === 'analysis' ? 'Gemini 2.5 Pro' : 'Gemini 2.5 Flash'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent/50 h-8 w-8">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>مسح المحادثة</AlertDialogTitle>
                    <AlertDialogDescription>هل أنت متأكد من مسح المحادثة؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-row-reverse gap-2">
                    <AlertDialogAction onClick={() => setMessages([])}>مسح</AlertDialogAction>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent/50 h-8 w-8" onClick={() => { abortControllerRef.current?.abort(); setOpen(false); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="px-3 pt-2 pb-1 border-b border-border">
          <Tabs value={mode} onValueChange={handleModeChange}>
            <TabsList className="w-full h-8 p-0.5">
              {(Object.entries(MODE_CONFIG) as [ChatMode, typeof MODE_CONFIG['chat']][]).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <TabsTrigger key={key} value={key} className="flex-1 text-[11px] gap-1 h-7 data-[state=active]:shadow-sm" disabled={isLoading}>
                    <Icon className="w-3 h-3" />
                    {cfg.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-3">
          {messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <ModeIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">مرحباً! أنا المساعد الذكي لإدارة الوقف.</p>
              <p className="text-xs mt-1">{currentConfig.welcome}</p>
            </div>
          )}
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-start' : 'justify-end')}>
                <div className={cn(
                  'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-end">
                <div className="bg-muted rounded-xl px-4 py-2 text-sm">
                  <span className="animate-pulse">يفكر...</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t border-border flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={currentConfig.placeholder}
            maxLength={2000}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={isLoading}
          />
          <Button onClick={send} disabled={!input.trim() || isLoading} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );
};

export default AiAssistant;
