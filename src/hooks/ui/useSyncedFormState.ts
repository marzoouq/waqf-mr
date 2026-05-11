/**
 * useSyncedFormState — إدارة نموذج محلي يتزامن مع قيمة مصدر بدون useEffect
 * يستخدم نمط React الموصى به (setState during render) لتجنّب cascading renders
 * وحلقة effect → state → effect.
 *
 * الاستخدام:
 *   const [form, setForm] = useSyncedFormState(serverValue);
 *
 * عندما يتغيّر serverValue (مرجعياً) يُعاد ضبط form إليه دون انتظار effect.
 */
import { useState } from 'react';

export function useSyncedFormState<T>(source: T) {
  const [form, setForm] = useState<T>(source);
  const [prev, setPrev] = useState<T>(source);
  if (prev !== source) {
    setPrev(source);
    setForm(source);
  }
  return [form, setForm] as const;
}
