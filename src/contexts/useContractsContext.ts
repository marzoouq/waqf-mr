/**
 * useContractsContext — hook مستهلك لـ ContractsContext
 *
 * ⚙️ قرار معماري: هذا الملف منفصل عن `ContractsContext.tsx` و `ContractsContextValue.ts`
 * عمداً لتفعيل Fast Refresh في Vite. السبب: Fast Refresh يتطلب أن يصدّر الملف
 * مكونات React فقط (أو هوكات فقط) — خلط `createContext` + Provider + hook
 * في ملف واحد يُعطّل HMR ويُجبر full reload عند كل تعديل.
 *
 * البنية:
 *   - ContractsContextValue.ts → تعريف Context + النوع
 *   - ContractsContext.tsx     → Provider component
 *   - useContractsContext.ts   → هذا الملف (consumer hook)
 */
import { useContext } from 'react';
import { ContractsContext, type ContractsContextValue } from './ContractsContextValue';

export const useContractsContext = (): ContractsContextValue => {
  const ctx = useContext(ContractsContext);
  if (!ctx) throw new Error('useContractsContext must be used within ContractsProvider');
  return ctx;
};
