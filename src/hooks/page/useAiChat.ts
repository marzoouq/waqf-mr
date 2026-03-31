/**
 * هوك منطق المساعد الذكي — محادثات في الذاكرة فقط (بدون حفظ في قاعدة البيانات)
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const AI_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/ai-assistant` : null;

type Msg = { role: 'user' | 'assistant'; content: string };
export type ChatMode = 'chat' | 'analysis' | 'report';

const SEND_COOLDOWN_MS = 2000;

export function useAiChat() {
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

  const isAvailable = role === 'admin' || role === 'accountant' || role === 'beneficiary' || role === 'waqif';

  const handleModeChange = (newMode: string) => {
    if (newMode === mode) return;
    abortControllerRef.current?.abort();
    setMode(newMode as ChatMode);
    setMessages([]);
    setIsLoading(false);
  };

  const send = async () => {
    const trimmed = input.trim().slice(0, 1000);
    if (!trimmed || isLoading) return;

    const now = Date.now();
    if (now - lastSendTimeRef.current < SEND_COOLDOWN_MS) return;
    lastSendTimeRef.current = now;

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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('يجب تسجيل الدخول لاستخدام المساعد الذكي');
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
      logger.error('خطأ في المساعد الذكي', e);
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ ${e instanceof Error ? e.message : 'حدث خطأ'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const closePanel = useCallback(() => {
    abortControllerRef.current?.abort();
    setOpen(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
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
  };
}

export type { Msg };
