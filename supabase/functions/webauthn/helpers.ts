import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { ALLOWED_ORIGINS, ALLOWED_ORIGIN_PATTERNS } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

export function getSupabaseAdmin(): SupabaseClient {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface RpInfo {
  rpID: string;
  rpName: string;
  origin: string;
}

/**
 * استخراج rpID و origin من الطلب مع التحقق من origin whitelist.
 * WebAuthn يتطلب أن يتطابق rpID مع نطاق الصفحة الحالية تماماً.
 */
export function getRpInfo(req: Request): RpInfo {
  const origin = req.headers.get("origin") || "https://waqf-mr.lovable.app";

  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin));

  if (!isAllowed) {
    throw new Error("Origin غير مسموح به");
  }

  const url = new URL(origin);
  return {
    rpID: url.hostname,
    rpName: "نظام إدارة الوقف",
    origin,
  };
}

export async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export const toBase64 = (arr: Uint8Array): string =>
  btoa(Array.from(arr, (b) => String.fromCharCode(b)).join(''));

export const fromBase64 = (s: string): Uint8Array =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
