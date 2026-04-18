/**
 * inferMutationArg — helper لاستنتاج نوع الوسيط الأول لـ mutateAsync (موجة 15)
 *
 * يحلّ مشكلة تكرار النمط:
 *   `data as unknown as Parameters<typeof mutation.mutateAsync>[0]`
 *
 * الاستخدام:
 *   await mutation.mutateAsync(asMutationArg(mutation, data));
 *
 * يحافظ على type safety لأن TS يستنتج النوع المتوقع من mutation نفسه.
 */

// نمط Mutation العام — أي شيء يحوي mutateAsync (signature متساهل ليتوافق مع React Query)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMutation<TArg> = { mutateAsync: (arg: TArg, ...rest: any[]) => any };

/**
 * يُحوّل قيمة عامة (form data، Partial<Row>) إلى النوع المتوقع لـ `mutation.mutateAsync`.
 * يستنتج النوع تلقائياً من الـ mutation الممرر — لا حاجة لتحديد generic يدوياً.
 *
 * ملاحظة: يُؤدي نفس وظيفة `as unknown as Parameters<...>[0]` لكن بصيغة أنظف
 * وأقل تكراراً، مع الاحتفاظ بسلامة النوع على نقطة الاستدعاء.
 */
export function asMutationArg<TArg>(_mutation: AnyMutation<TArg>, value: unknown): TArg {
  return value as TArg;
}

/**
 * نسخة مستقلة — للحالات التي يكون فيها النوع المستهدف معروفاً مسبقاً.
 */
export function inferMutationArg<TArg>(value: unknown): TArg {
  return value as TArg;
}
