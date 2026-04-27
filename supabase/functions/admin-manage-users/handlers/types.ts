// ═══════════════════════════════════════════════════════════════════════════════
// handlers/types.ts — أنواع مشتركة بين handlers
// ═══════════════════════════════════════════════════════════════════════════════

import type { AdminClient } from "../../_shared/auth.ts";

export interface HandlerContext {
  admin: AdminClient;
  callerId: string;
  // deno-lint-ignore no-explicit-any
  body: Record<string, any>;
  corsHeaders: Record<string, string>;
}

export type HandlerResult = Response;

export const json = (body: unknown, status: number, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export const ok = (body: unknown, corsHeaders: Record<string, string>) => json(body, 200, corsHeaders);
