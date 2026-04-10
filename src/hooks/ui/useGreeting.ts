/**
 * هوك مشترك للتحية والتاريخ — يُزيل التكرار من عدة مكونات
 * يُدير timer كل دقيقة مع visibilitychange لتحديث الوقت
 */
import { useState, useEffect, useMemo } from 'react';

export interface GreetingData {
  greeting: string;
  greetingIconName: 'sun' | 'moon';
  hijriDate: string;
  gregorianDate: string;
  timeStr: string;
}

export const useGreeting = (): GreetingData => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    const start = () => { id = setInterval(() => setNow(new Date()), 60_000); };
    const stop = () => { if (id) { clearInterval(id); id = undefined; } };
    const onVisibility = () => {
      if (document.hidden) { stop(); } else { setNow(new Date()); start(); }
    };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  const hour = now.getHours();

  const { hijriDate, gregorianDate, timeStr } = useMemo(() => ({
    hijriDate: now.toLocaleDateString('ar-SA-u-ca-islamic', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    gregorianDate: now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }),
    timeStr: now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
  }), [now]);

  return {
    greeting: hour < 12 ? 'صباح الخير' : 'مساء الخير',
    greetingIconName: hour < 12 ? 'sun' : 'moon',
    hijriDate,
    gregorianDate,
    timeStr,
  };
};
