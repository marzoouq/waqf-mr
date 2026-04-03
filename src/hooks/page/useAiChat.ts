/**
 * هوك منطق المساعد الذكي — محادثات في الذاكرة فقط (بدون حفظ في قاعدة البيانات)
 * يدعم: Streaming، Fallback UI، إعادة المحاولة
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { logger } from '@/lib/logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const AI_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/ai-assistant` : null;

type Msg = { role: 'user' | 'assistant'; content: string };
export type ChatMode = 'chat' | 'analysis' | 'report';

const SEND_COOLDOWN_MS = 2000;

export function useAiChat() {
  const { user, role, session } = useAuth();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>('chat');
  const [error, setError] = useState<string | null>(null);
  const lastSendTimeRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserMsgRef = useRef<string>('');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  const isAvailable = role === 'admin' || role === 'accountant' || role === 'beneficiary' || role === 'waqif';

  const handleModeChange = (newMode: string) => {
    if (newMode === mode) return;
    abortControllerRef.current?.abort();
    setMode(newMode as ChatMode);
    setMessages([]);
    setIsLoading(false);
    setError(null);
  };

  const sendMessage = useCallback(async (messageText: string) => {
    const trimmed = messageText.trim().slice(0, 1000);
    if (!trimmed || isLoading) return;

    const now = Date.now();
    if (now - lastSendTimeRef.current < SEND_COOLDOWN_MS) return;
    lastSendTimeRef.current = now;
    lastUserMsgRef.current = trimmed;
    setError(null);

    if (!AI_URL) {
      setError('خطأ في إعداد المساعد الذكي — تعذر الاتصال بالخادم.');
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
      if (!session?.access_token) throw new Error('يجب تسجيل الدخول لاستخدام المساعد الذكي');
      const accessToken = session.access_token;

      const resp = await fetch(AI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ messages: allMessages, mode }),
        signal: abortControllerRef.current.signal,
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        const errMsg = err.error || 'فشل الاتصال بالمساعد الذكي';
        // رسائل خطأ واضحة حسب حالة HTTP
        if (resp.status === 429) {
          const isDaily = err.code === 'DAILY_QUOTA_EXCEEDED';
          throw new Error(isDaily ? errMsg : 'تم تجاوز حد الطلبات — انتظر قليلاً ثم حاول مجدداً');
        }
        if (resp.status === 402) throw new Error('يرجى إضافة رصيد لاستخدام المساعد الذكي');
        if (resp.status === 503) throw new Error('الخدمة غير متاحة مؤقتاً — حاول لاحقاً');
        throw new Error(errMsg);
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
      const errMessage = e instanceof Error ? e.message : 'حدث خطأ غير متوقع';
      logger.error('خطأ في المساعد الذكي', e);
      setError(errMessage);
      // إضافة رسالة خطأ في المحادثة أيضاً
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ ${errMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, mode, session, isLoading]);

  const send = useCallback(() => {
    sendMessage(input);
  }, [input, sendMessage]);

  /** إعادة إرسال آخر رسالة (للـ Fallback UI) */
  const retryLast = useCallback(() => {
    setError(null);
    // حذف آخر رسالة خطأ من المساعد إن وجدت
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === 'assistant' && last.content.startsWith('❌')) {
        return prev.slice(0, -1);
      }
      return prev;
    });
    if (lastUserMsgRef.current) {
      // إعادة إرسال بدون إضافة رسالة المستخدم مرة أخرى
      sendMessage(lastUserMsgRef.current);
    }
  }, [sendMessage]);

  const closePanel = useCallback(() => {
    abortControllerRef.current?.abort();
    setOpen(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    user, role, isAvailable,
    open, setOpen, closePanel,
    messages, clearMessages,
    input, setInput,
    isLoading,
    mode, handleModeChange,
    send,
    endRef,
    error, retryLast,
  };
}

export type { Msg };
