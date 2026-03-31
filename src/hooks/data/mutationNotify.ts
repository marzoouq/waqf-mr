/**
 * إشعارات مشتركة للـ mutations اليدوية (خارج createCrudFactory)
 * يفصل طبقة البيانات عن toast مباشرة — يسهّل الاستبدال أو الإيقاف لاحقاً
 */
import { toast } from 'sonner';
import type { ExternalToast } from 'sonner';

export interface MutationNotify {
  success: (msg: string, opts?: ExternalToast) => void;
  error: (msg: string, opts?: ExternalToast) => void;
  info: (msg: string, opts?: ExternalToast) => void;
  warning: (msg: string, opts?: ExternalToast) => void;
}

/** الإشعارات الافتراضية عبر sonner — يمكن استبدالها عبر تمرير notify مخصص */
export const defaultNotify: MutationNotify = {
  success: (msg, opts) => toast.success(msg, opts),
  error: (msg, opts) => toast.error(msg, opts),
  info: (msg, opts) => toast.info(msg, opts),
  warning: (msg, opts) => toast.warning(msg, opts),
};
