/**
 * هوك منطق المساعد الذكي — يجمع الحالة (useAiChatState) مع إرسال الرسائل.
 * يدعم: Streaming، Fallback UI، إعادة المحاولة.
 */
import { useCallback } from 'react';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { logger } from '@/lib/logger';
import { streamChatCompletion } from '@/lib/ai/streamChat';
import { useAiChatState, type Msg } from './ai/useAiChatState';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const AI_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/ai-assistant` : null;
const SEND_COOLDOWN_MS = 2000;
const HISTORY_LIMIT = 10;

export function useAiChat() {
  const { user, role, session } = useAuth();
  const s = useAiChatState();
  const { refs } = s;

  const isAvailable = role === 'admin' || role === 'accountant' || role === 'beneficiary' || role === 'waqif';

  const sendMessage = useCallback(async (messageText: string) => {
    const trimmed = messageText.trim().slice(0, 1000);
    if (!trimmed || s.isLoading) return;

    const now = Date.now();
    if (now - refs.lastSendTimeRef.current < SEND_COOLDOWN_MS) return;
    refs.lastSendTimeRef.current = now;
    refs.lastUserMsgRef.current = trimmed;
    s.setError(null);

    if (!AI_URL) { s.setError('خطأ في إعداد المساعد الذكي — تعذر الاتصال بالخادم.'); return; }

    refs.abortControllerRef.current?.abort();
    refs.abortControllerRef.current = new AbortController();

    const userMsg: Msg = { role: 'user', content: trimmed };
    const allMessages = [...s.messages, userMsg].slice(-HISTORY_LIMIT);
    s.setMessages(allMessages);
    s.setInput('');
    s.setIsLoading(true);

    let assistantContent = '';
    try {
      if (!session?.access_token) throw new Error('يجب تسجيل الدخول لاستخدام المساعد الذكي');
      await streamChatCompletion({
        url: AI_URL,
        accessToken: session.access_token,
        apiKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        body: { messages: allMessages, mode: s.mode },
        signal: refs.abortControllerRef.current.signal,
        onContent: (chunk) => {
          assistantContent += chunk;
          s.setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') {
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
            }
            return [...prev, { role: 'assistant', content: assistantContent }];
          });
        },
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      const msg = e instanceof Error ? e.message : 'حدث خطأ غير متوقع';
      logger.error('خطأ في المساعد الذكي', e);
      s.setError(msg);
      s.setMessages((prev) => [...prev, { role: 'assistant', content: `❌ ${msg}` }]);
    } finally {
      s.setIsLoading(false);
    }
  }, [s, refs, session]);

  const send = useCallback(() => { sendMessage(s.input); }, [s.input, sendMessage]);

  const retryLast = useCallback(() => {
    s.setError(null);
    s.setMessages((prev) => {
      const last = prev[prev.length - 1];
      return last?.role === 'assistant' && last.content.startsWith('❌') ? prev.slice(0, -1) : prev;
    });
    if (refs.lastUserMsgRef.current) sendMessage(refs.lastUserMsgRef.current);
  }, [s, refs, sendMessage]);

  return {
    user, role, isAvailable,
    open: s.open, setOpen: s.setOpen, closePanel: s.closePanel,
    messages: s.messages, clearMessages: s.clearMessages,
    input: s.input, setInput: s.setInput,
    isLoading: s.isLoading,
    mode: s.mode, handleModeChange: s.handleModeChange,
    send, endRef: refs.endRef,
    error: s.error, retryLast,
  };
}

export type { Msg, ChatMode } from './ai/useAiChatState';
