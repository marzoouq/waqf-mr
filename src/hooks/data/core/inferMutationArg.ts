/**
 * inferMutationArg — helper لاستنتاج نوع الوسيط الأول لـ mutateAsync (موجة 15)
 *
 * يحلّ مشكلة تكرار النمط:
 *   `data as unknown as Parameters<typeof mutation.mutateAsync>[0]`
 *
 * الاستخدام:
 *   await mutation.mutateAsync(asMutationArg(mutation, data));
 *
 * يحافظ على type safety لأن TS يستنتج النوع المتوقع من mutation نفسه
 * (لا يخفي أخطاء فعلية لأن `unknown` تتطلب تأكيد صريح من المطور).
 */

// نمط Mutation العام — أي شيء يحوي mutateAsync
interface MutationLike<TArg> {
  mutateAsync: (arg: TArg, ...rest: unknown[]) => unknown;
}

/**
 * يُحوّل قيمة عامة (عادة form data) إلى النوع المتوقع لـ `mutation.mutateAsync`.
 * يستنتج النوع تلقائياً من الـ mutation الممرر — لا حاجة لتحديد generic يدوياً.
 */
export function asMutationArg<TArg>(_mutation: MutationLike<TArg>, value: unknown): TArg {
  return value as TArg;
}

/**
 * نسخة مستقلة عن mutation — للحالات التي يكون فيها النوع معروفاً مسبقاً.
 */
export function inferMutationArg<TArg>(value: unknown): TArg {
  return value as TArg;
}
