/**
 * حالة المساعد الذكي — الفصل بين الحالة وإرسال الرسائل لاحترام حدود الحجم.
 * يكشف helpers لتعديل refs داخلياً ليحترم react-hooks/immutability في الـ consumer.
 */
import { useState, useRef, useEffect, useCallback } from 'react';

export type ChatMode = 'chat' | 'analysis' | 'report';
export type Msg = { role: 'user' | 'assistant'; content: string };

const SEND_COOLDOWN_MS = 2000;

export function useAiChatState() {
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

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const handleModeChange = useCallback((newMode: string) => {
    if (newMode === mode) return;
    abortControllerRef.current?.abort();
    setMode(newMode as ChatMode);
    setMessages([]);
    setIsLoading(false);
    setError(null);
  }, [mode]);

  const closePanel = useCallback(() => {
    abortControllerRef.current?.abort();
    setOpen(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  /** يفحص cooldown ويسجل وقت الإرسال إن نجح. يُرجع true إذا كان مسموحاً بالإرسال. */
  const tryBeginSend = useCallback(() => {
    const now = Date.now();
    if (now - lastSendTimeRef.current < SEND_COOLDOWN_MS) return false;
    lastSendTimeRef.current = now;
    return true;
  }, []);

  const setLastUserMsg = useCallback((msg: string) => { lastUserMsgRef.current = msg; }, []);
  const getLastUserMsg = useCallback(() => lastUserMsgRef.current, []);

  /** يلغي أي طلب جارٍ ويبدأ طلباً جديداً، ويُرجع AbortSignal. */
  const beginRequest = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current.signal;
  }, []);

  return {
    open, setOpen, closePanel,
    messages, setMessages, clearMessages,
    input, setInput,
    isLoading, setIsLoading,
    mode, handleModeChange,
    error, setError,
    endRef,
    tryBeginSend, setLastUserMsg, getLastUserMsg, beginRequest,
  };
}
