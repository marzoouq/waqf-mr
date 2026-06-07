/**
 * بثّ ردود المساعد الذكي من Edge Function (SSE/OpenAI-style chunks).
 * يفصل منطق الشبكة عن hook الواجهة لاحترام حدود حجم الـ hook.
 */

export interface StreamChatOptions {
  url: string;
  accessToken: string;
  apiKey: string;
  body: unknown;
  signal: AbortSignal;
  onContent: (chunk: string) => void;
}

export async function streamChatCompletion(opts: StreamChatOptions): Promise<void> {
  const resp = await fetch(opts.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: opts.apiKey,
      Authorization: `Bearer ${opts.accessToken}`,
    },
    body: JSON.stringify(opts.body),
    signal: opts.signal,
  });

  if (!resp.ok || !resp.body) {
    const err = await resp.json().catch(() => ({} as Record<string, unknown>));
    const errMsg = (err as { error?: string }).error || 'فشل الاتصال بالمساعد الذكي';
    if (resp.status === 429) {
      const isDaily = (err as { code?: string }).code === 'DAILY_QUOTA_EXCEEDED';
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

    let nl: number;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') return;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) opts.onContent(content);
      } catch {
        buffer = line + '\n' + buffer;
        break;
      }
    }
  }
}
