// ═══════════════════════════════════════════════════════════════════════════════
// utils.ts — مساعدات process-email-queue
// ═══════════════════════════════════════════════════════════════════════════════

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

// deno-lint-ignore no-explicit-any
export type AnyClient = SupabaseClient<any, any, any, any, any>;

export type QueueMessage = {
  msg_id: number;
  // deno-lint-ignore no-explicit-any
  message: Record<string, any>;
  read_ct?: number;
  enqueued_at?: string;
};

export const MAX_RETRIES = 5;
export const DEFAULT_BATCH_SIZE = 10;
export const DEFAULT_SEND_DELAY_MS = 200;
export const DEFAULT_AUTH_TTL_MINUTES = 15;
export const DEFAULT_TRANSACTIONAL_TTL_MINUTES = 60;

/** Check if an error is a rate-limit (429) response. */
export function isRateLimited(error: unknown): boolean {
  if (error && typeof error === "object" && "status" in error) {
    return (error as { status: number }).status === 429;
  }
  return error instanceof Error && error.message.includes("429");
}

/** Check if an error is a forbidden (403) response — emails disabled. */
export function isForbidden(error: unknown): boolean {
  if (error && typeof error === "object" && "status" in error) {
    return (error as { status: number }).status === 403;
  }
  return error instanceof Error && error.message.includes("403");
}

/** Extract Retry-After seconds from a structured EmailAPIError, or default to 60s. */
export function getRetryAfterSeconds(error: unknown): number {
  if (error && typeof error === "object" && "retryAfterSeconds" in error) {
    return (error as { retryAfterSeconds: number | null }).retryAfterSeconds ?? 60;
  }
  return 60;
}

/** Move a message to the dead letter queue and log the reason. */
export async function moveToDlq(
  supabase: AnyClient,
  queue: string,
  msg: QueueMessage,
  reason: string,
): Promise<void> {
  const payload = msg.message;
  await supabase.from("email_send_log").insert({
    message_id: payload.message_id,
    template_name: (payload.label || queue) as string,
    recipient_email: payload.to,
    status: "dlq",
    error_message: reason,
  });
  const { error } = await supabase.rpc("move_to_dlq", {
    source_queue: queue,
    dlq_name: `${queue}_dlq`,
    message_id: msg.msg_id,
    payload,
  });
  if (error) {
    console.error("Failed to move message to DLQ", { queue, msg_id: msg.msg_id, reason, error });
  }
}
