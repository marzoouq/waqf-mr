/**
 * حالة المساعد الذكي — الفصل بين الحالة وإرسال الرسائل لاحترام حدود الحجم.
 */
import { useState, useRef, useEffect, useCallback } from 'react';

export type ChatMode = 'chat' | 'analysis' | 'report';
export type Msg = { role: 'user' | 'assistant'; content: string };

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

  return {
    open, setOpen, closePanel,
    messages, setMessages, clearMessages,
    input, setInput,
    isLoading, setIsLoading,
    mode, handleModeChange,
    error, setError,
    refs: { lastSendTimeRef, endRef, abortControllerRef, lastUserMsgRef },
  };
}
