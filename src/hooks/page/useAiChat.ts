/**
 * هوك منطق المساعد الذكي مع حفظ المحادثات في قاعدة البيانات
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const AI_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/ai-assistant` : null;

type Msg = { role: 'user' | 'assistant'; content: string };
export type ChatMode = 'chat' | 'analysis' | 'report';

interface AiChatSession {
  id: string;
  mode: string;
  title: string | null;
  messages: Msg[];
  created_at: string;
  updated_at: string;
}

const SEND_COOLDOWN_MS = 2000;
const SESSIONS_QUERY_KEY = ['ai-chat-sessions'];

export function useAiChat() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>('chat');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
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

  // ── جلب سجل المحادثات ──
  const { data: sessions = [] } = useQuery<AiChatSession[]>({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .select('id, mode, title, messages, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) { logger.error('فشل جلب محادثات AI', error); return []; }
      return (data ?? []).map(s => ({
        ...s,
        messages: (Array.isArray(s.messages) ? s.messages : []) as Msg[],
      }));
    },
    enabled: !!user && isAvailable,
    staleTime: 2 * 60_000,
  });

  // ── حفظ الجلسة في قاعدة البيانات ──
  const saveSession = useCallback(async (msgs: Msg[], sessionMode: ChatMode, sessionId: string | null): Promise<string | null> => {
    if (!user || msgs.length === 0) return sessionId;
    // استخراج عنوان من أول رسالة للمستخدم
    const firstUserMsg = msgs.find(m => m.role === 'user');
    const title = firstUserMsg?.content.slice(0, 80) ?? null;

    try {
      if (sessionId) {
        // تحديث جلسة موجودة
        await supabase
          .from('ai_chat_sessions')
          .update({ messages: msgs as unknown as Record<string, unknown>[], title })
          .eq('id', sessionId)
          .eq('user_id', user.id);
        return sessionId;
      }
      // إنشاء جلسة جديدة
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .insert({ user_id: user.id, mode: sessionMode, messages: msgs as unknown as Record<string, unknown>[], title })
        .select('id')
        .single();
      if (error) { logger.error('فشل حفظ جلسة AI', error); return null; }
      return data?.id ?? null;
    } catch (e) {
      logger.error('خطأ في حفظ جلسة AI', e);
      return sessionId;
    }
  }, [user]);

  const handleModeChange = (newMode: string) => {
    if (newMode === mode) return;
    abortControllerRef.current?.abort();
    // حفظ المحادثة الحالية قبل التبديل
    if (messages.length > 0) {
      saveSession(messages, mode, activeSessionId).then(() => {
        queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
      });
    }
    setMode(newMode as ChatMode);
    setMessages([]);
    setActiveSessionId(null);
    setIsLoading(false);
  };

  // ── تحميل جلسة سابقة ──
  const loadSession = useCallback((session: AiChatSession) => {
    setMessages(session.messages);
    setMode(session.mode as ChatMode);
    setActiveSessionId(session.id);
    setShowHistory(false);
  }, []);

  // ── حذف جلسة ──
  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user) return;
    await supabase
      .from('ai_chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id);
    if (activeSessionId === sessionId) {
      setMessages([]);
      setActiveSessionId(null);
    }
    queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
  }, [user, activeSessionId, queryClient]);

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
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) throw new Error('يجب تسجيل الدخول لاستخدام المساعد الذكي');

      const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
      const stored = localStorage.getItem(storageKey);
      const accessToken = stored ? JSON.parse(stored)?.access_token : null;
      if (!accessToken) throw new Error('تعذر استخراج رمز المصادقة — أعد تسجيل الدخول');

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

      // حفظ المحادثة بعد اكتمال الرد
      const finalMessages = [...allMessages.filter(m => m.role === 'user'), ...(assistantContent ? [{ role: 'assistant' as const, content: assistantContent }] : [])];
      // دمج الرسائل القديمة مع الجديدة
      const mergedMessages = [...messages, userMsg, ...(assistantContent ? [{ role: 'assistant' as const, content: assistantContent }] : [])].slice(-HISTORY_LIMIT);
      const newId = await saveSession(mergedMessages, mode, activeSessionId);
      if (newId) setActiveSessionId(newId);
      queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });

    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ ${e instanceof Error ? e.message : 'حدث خطأ'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const closePanel = () => {
    abortControllerRef.current?.abort();
    // حفظ المحادثة عند الإغلاق
    if (messages.length > 0) {
      saveSession(messages, mode, activeSessionId).then(() => {
        queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
      });
    }
    setOpen(false);
  };

  const clearMessages = () => {
    setMessages([]);
    setActiveSessionId(null);
  };

  const startNewChat = useCallback(() => {
    // حفظ المحادثة الحالية أولاً
    if (messages.length > 0) {
      saveSession(messages, mode, activeSessionId).then(() => {
        queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
      });
    }
    setMessages([]);
    setActiveSessionId(null);
    setShowHistory(false);
  }, [messages, mode, activeSessionId, saveSession, queryClient]);

  return {
    user, role, isAvailable,
    open, setOpen, closePanel,
    messages, clearMessages,
    input, setInput,
    isLoading,
    mode, handleModeChange,
    send,
    endRef,
    // جديد: إدارة الجلسات
    sessions,
    activeSessionId,
    showHistory, setShowHistory,
    loadSession,
    deleteSession,
    startNewChat,
  };
}

export type { Msg, AiChatSession };
