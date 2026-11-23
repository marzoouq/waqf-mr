import { describe, it, expect } from 'vitest';
import { meaningfulChangelog } from './changelog';

const entry = (version: string, texts: string[]) => ({
  version, date: '٢٣ نوفمبر ٢٠٢٦', changes: texts.map((text) => ({ type: 'feature' as const, text })),
});

describe('meaningfulChangelog', () => {
  it('يُسقط الإصدارات التي لا تحوي إلا «تحسينات وإصلاحات متنوعة»', () => {
    const list = [entry('3.0.2', ['تحسينات وإصلاحات متنوعة']), entry('3.0.1', ['هوية جديدة لملفات PDF'])];
    expect(meaningfulChangelog(list).map((e) => e.version)).toEqual(['3.0.1']);
  });

  it('يُبقي البنود المفيدة ويحذف العامة داخل الإصدار نفسه', () => {
    const [e] = meaningfulChangelog([entry('3.1.0', ['تحسينات داخلية واستقرار النظام', 'رقم الإصدار في الإعدادات'])]);
    expect(e?.changes.map((c) => c.text)).toEqual(['رقم الإصدار في الإعدادات']);
  });

  it('لا يعرض أكثر من الحد المطلوب', () => {
    const list = Array.from({ length: 8 }, (_, i) => entry(`3.0.${i}`, [`تغيير رقم ${i}`]));
    expect(meaningfulChangelog(list, 5)).toHaveLength(5);
  });

  it('يعيد قائمة فارغة لمدخل غير صالح', () => {
    expect(meaningfulChangelog(null)).toEqual([]);
  });
});
