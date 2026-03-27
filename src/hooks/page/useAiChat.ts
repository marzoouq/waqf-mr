/**
 * هوك منطق المساعد الذكي — مدمج مع نظام المراسلات (conversations + messages)
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { STALE_MESSAGING } from '@/lib/queryStaleTime';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const AI_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/ai-assistant` : null;

type Msg = { role: 'user' | 'assistant'; content: string };
export type ChatMode = 'chat' | 'analysis' | 'report';

/** محادثة AI (من جدول conversations) */
interface AiConversation {
  id: string;
  subject: string | null;
  ai_mode: string | null;
  created_at: string;
  updated_at: string;
}

const SEND_COOLDOWN_MS = 2000;
const SESSIONS_QUERY_KEY = ['ai-conversations'];
const HISTORY_LIMIT = 10;

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

  // ── جلب قائمة محادثات AI ──
  const { data: sessions = [] } = useQuery<AiConversation[]>({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('conversations')
        .select('id, subject, ai_mode, created_at, updated_at')
        .eq('created_by', user.id)
        .eq('type', 'ai_chat')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) { logger.error('فشل جلب محادثات AI', error); return []; }
      return (data ?? []) as AiConversation[];
    },
    enabled: !!user && isAvailable,
    staleTime: STALE_MESSAGING,
  });

  // ── إنشاء محادثة جديدة في DB ──
  const createConversation = useCallback(async (title: string, chatMode: ChatMode): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        type: 'ai_chat',
        subject: title.slice(0, 80) || null,
        created_by: user.id,
        participant_id: null,
        ai_mode: chatMode,
      })
      .select('id')
      .single();
    if (error) { logger.error('فشل إنشاء محادثة AI', error); return null; }
    return data?.id ?? null;
  }, [user]);

  // ── إدراج رسالة في DB ──
  const insertMessage = useCallback(async (conversationId: string, content: string, isAi: boolean) => {
    if (!user) return;
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      is_ai_response: isAi,
      is_read: true, // رسائل AI مقروءة دائماً
    });
    if (error) logger.error('فشل حفظ رسالة AI', error);
    // تحديث updated_at للمحادثة
    await supabase.from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  }, [user]);

  // ── تحميل جلسة سابقة ──
  const loadSession = useCallback(async (session: AiConversation) => {
    const { data, error } = await supabase
      .from('messages')
      .select('content, is_ai_response')
      .eq('conversation_id', session.id)
      .order('created_at', { ascending: true })
      .limit(HISTORY_LIMIT * 2);
    if (error) { logger.error('فشل تحميل رسائل المحادثة', error); return; }
    const loaded: Msg[] = (data ?? []).map(m => ({
      role: (m.is_ai_response ? 'assistant' : 'user') as Msg['role'],
      content: m.content,
    }));
    setMessages(loaded);
    setMode((session.ai_mode as ChatMode) || 'chat');
    setActiveSessionId(session.id);
    setShowHistory(false);
  }, []);

  // ── حذف جلسة ──
  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user) return;
    // حذف الرسائل أولاً ثم المحادثة
    await supabase.from('messages').delete().eq('conversation_id', sessionId);
    await supabase.from('conversations').delete().eq('id', sessionId).eq('created_by', user.id);
    if (activeSessionId === sessionId) {
      setMessages([]);
      setActiveSessionId(null);
    }
    queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
  }, [user, activeSessionId, queryClient]);

  const handleModeChange = (newMode: string) => {
    if (newMode === mode) return;
    abortControllerRef.current?.abort();
    // بدء محادثة جديدة عند تغيير الوضع
    setMode(newMode as ChatMode);
    setMessages([]);
    setActiveSessionId(null);
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
    const allMessages = [...messages, userMsg].slice(-HISTORY_LIMIT);
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) throw new Error('يجب تسجيل الدخول لاستخدام المساعد الذكي');

      // إنشاء محادثة جديدة إذا لم تكن موجودة
      let convId = activeSessionId;
      if (!convId) {
        convId = await createConversation(trimmed, mode);
        if (!convId) throw new Error('فشل إنشاء المحادثة');
        setActiveSessionId(convId);
      }

      // حفظ رسالة المستخدم في DB
      await insertMessage(convId, trimmed, false);

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

      // حفظ رد المساعد الذكي في DB
      if (assistantContent && convId) {
        await insertMessage(convId, assistantContent, true);
      }
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
    setOpen(false);
  };

  const clearMessages = () => {
    setMessages([]);
    setActiveSessionId(null);
  };

  const startNewChat = useCallback(() => {
    setMessages([]);
    setActiveSessionId(null);
    setShowHistory(false);
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
    sessions,
    activeSessionId,
    showHistory, setShowHistory,
    loadSession,
    deleteSession,
    startNewChat,
  };
}

export type { Msg, AiConversation };
