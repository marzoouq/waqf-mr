// ═══════════════════════════════════════════════════════════════════════════════
// أدوات ZATCA المشتركة — تُستورد من وظائف الحافة المختلفة
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from "npm:@supabase/supabase-js@2";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
export const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
export const ZATCA_API_URL_ENV = Deno.env.get("ZATCA_API_URL") || "";

export const ZATCA_URLS: Record<string, string> = {
  production: "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal",
  sandbox: "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation",
};

export const ZATCA_COMMON_HEADERS = {
  "Content-Type": "application/json",
  "Accept": "application/json",
  "Accept-Version": "V2",
};

// ═══════════════════════════════════════════════════════════════════════════════
// ASN.1 Encoding Utilities
// ═══════════════════════════════════════════════════════════════════════════════

function asn1Length(len: number): Uint8Array {
  if (len < 128) return new Uint8Array([len]);
  if (len < 256) return new Uint8Array([0x81, len]);
  return new Uint8Array([0x82, (len >> 8) & 0xff, len & 0xff]);
}

function asn1Wrap(tag: number, content: Uint8Array): Uint8Array {
  const len = asn1Length(content.length);
  const result = new Uint8Array(1 + len.length + content.length);
  result[0] = tag;
  result.set(len, 1);
  result.set(content, 1 + len.length);
  return result;
}

export function asn1Sequence(items: Uint8Array[]): Uint8Array {
  const totalLen = items.reduce((s, i) => s + i.length, 0);
  const content = new Uint8Array(totalLen);
  let offset = 0;
  for (const item of items) { content.set(item, offset); offset += item.length; }
  return asn1Wrap(0x30, content);
}

export function asn1Set(items: Uint8Array[]): Uint8Array {
  const totalLen = items.reduce((s, i) => s + i.length, 0);
  const content = new Uint8Array(totalLen);
  let offset = 0;
  for (const item of items) { content.set(item, offset); offset += item.length; }
  return asn1Wrap(0x31, content);
}

export function asn1Integer(value: number): Uint8Array {
  return asn1Wrap(0x02, new Uint8Array([value]));
}

export function asn1Oid(components: number[]): Uint8Array {
  const bytes: number[] = [];
  bytes.push(components[0] * 40 + components[1]);
  for (let i = 2; i < components.length; i++) {
    let val = components[i];
    if (val >= 128) {
      const stack: number[] = [];
      while (val > 0) { stack.unshift(val & 0x7f); val >>= 7; }
      for (let j = 0; j < stack.length - 1; j++) stack[j] |= 0x80;
      bytes.push(...stack);
    } else {
      bytes.push(val);
    }
  }
  return asn1Wrap(0x06, new Uint8Array(bytes));
}

export function asn1Utf8String(str: string): Uint8Array {
  return asn1Wrap(0x0c, new TextEncoder().encode(str));
}

export function asn1PrintableString(str: string): Uint8Array {
  return asn1Wrap(0x13, new TextEncoder().encode(str));
}

export function asn1BitString(data: Uint8Array): Uint8Array {
  const content = new Uint8Array(1 + data.length);
  content[0] = 0;
  content.set(data, 1);
  return asn1Wrap(0x03, content);
}

export function asn1Context(tag: number, content: Uint8Array): Uint8Array {
  return asn1Wrap(0xa0 | tag, content);
}

export function asn1OctetString(data: Uint8Array): Uint8Array {
  return asn1Wrap(0x04, data);
}

export function asn1Ia5String(str: string): Uint8Array {
  return asn1Wrap(0x16, new TextEncoder().encode(str));
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSR & Crypto Helpers
// ═══════════════════════════════════════════════════════════════════════════════

export function buildCsrExtensions(solutionName: string, isProduction: boolean, deviceSerial: string): Uint8Array {
  const sanValue = deviceSerial || `1-${solutionName}|2-1|3-${crypto.randomUUID()}`;
  const uidAttr = asn1Set([asn1Sequence([asn1Oid([0, 9, 2342, 19200300, 100, 1, 1]), asn1Utf8String(sanValue)])]);
  const dirName = asn1Context(4, asn1Sequence([uidAttr]));
  const sanExtValue = asn1OctetString(asn1Sequence([dirName]));
  const sanExtension = asn1Sequence([asn1Oid([2, 5, 29, 17]), sanExtValue]);
  const templateName = isProduction ? "ZATCA-Code-Signing" : "PREZATCA-Code-Signing";
  const templateExtValue = asn1OctetString(asn1Ia5String(templateName));
  const templateExtension = asn1Sequence([asn1Oid([1, 3, 6, 1, 4, 1, 311, 20, 2]), templateExtValue]);
  const extensionsSeq = asn1Sequence([sanExtension, templateExtension]);
  return asn1Context(0, asn1Sequence([asn1Sequence([asn1Oid([1, 2, 840, 113549, 1, 9, 14]), asn1Set([extensionsSeq])])]));
}

export function buildDistinguishedName(attrs: { oid: number[]; value: string }[]): Uint8Array {
  const rdns = attrs.map(attr =>
    asn1Set([asn1Sequence([asn1Oid(attr.oid), attr.oid[3] === 6 ? asn1PrintableString(attr.value) : asn1Utf8String(attr.value)])])
  );
  return asn1Sequence(rdns);
}

export function buildEcSpki(publicKey: Uint8Array): Uint8Array {
  const algId = asn1Sequence([asn1Oid([1, 2, 840, 10045, 2, 1]), asn1Oid([1, 2, 840, 10045, 3, 1, 7])]);
  return asn1Sequence([algId, asn1BitString(publicKey)]);
}

export async function sha256Async(data: Uint8Array): Promise<Uint8Array> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Deno ArrayBufferLike ↔ ArrayBuffer mismatch
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data as any) as ArrayBuffer);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Certificate Helpers
// ═══════════════════════════════════════════════════════════════════════════════

export function parseCertExpiry(base64Cert: string): string | null {
  try {
    const binary = atob(base64Cert);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const times: string[] = [];
    for (let i = 0; i < bytes.length - 2; i++) {
      const tag = bytes[i];
      if (tag !== 0x17 && tag !== 0x18) continue;
      const len = bytes[i + 1];
      if (len === undefined || len < 10 || len > 20) continue;
      if (i + 2 + len > bytes.length) continue;
      const timeStr = new TextDecoder().decode(bytes.slice(i + 2, i + 2 + len));
      let iso: string;
      if (tag === 0x17) {
        const yy = parseInt(timeStr.slice(0, 2));
        const year = yy >= 50 ? 1900 + yy : 2000 + yy;
        iso = `${year}-${timeStr.slice(2, 4)}-${timeStr.slice(4, 6)}T${timeStr.slice(6, 8)}:${timeStr.slice(8, 10)}:${timeStr.slice(10, 12)}Z`;
      } else {
        iso = `${timeStr.slice(0, 4)}-${timeStr.slice(4, 6)}-${timeStr.slice(6, 8)}T${timeStr.slice(8, 10)}:${timeStr.slice(10, 12)}:${timeStr.slice(12, 14)}Z`;
      }
      if (!isNaN(new Date(iso).getTime())) times.push(iso);
      if (times.length >= 2) break;
    }
    return times.length >= 2 ? times[1] : null;
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZATCA API Helpers
// ═══════════════════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- admin client بدون Database generic
export async function resolveZatcaUrl(adminClient: any): Promise<string> {
  if (ZATCA_API_URL_ENV) return ZATCA_API_URL_ENV;
  const { data } = await adminClient.from("app_settings").select("value").eq("key", "zatca_platform").single();
  const platform = data?.value || "sandbox";
  return ZATCA_URLS[platform] || ZATCA_URLS.sandbox;
}

export async function logZatcaOperation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- admin client بدون Database generic
  admin: any,
  opts: {
    operation_type: string;
    status: string;
    request_summary?: Record<string, unknown>;
    response_summary?: Record<string, unknown>;
    error_message?: string;
    invoice_id?: string;
    user_id?: string;
  },
) {
  try {
    await admin.from("zatca_operation_log").insert({
      operation_type: opts.operation_type,
      status: opts.status,
      request_summary: opts.request_summary || {},
      response_summary: opts.response_summary || {},
      error_message: opts.error_message || null,
      invoice_id: opts.invoice_id || null,
      user_id: opts.user_id || null,
    });
  } catch (e) {
    console.error("Failed to log ZATCA operation:", e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Auth & Rate Limiting المشتركة
// ═══════════════════════════════════════════════════════════════════════════════

// deno-lint-ignore no-explicit-any
type AdminClient = ReturnType<typeof createClient<any, any, any>>;
export type AuthResult =
  | { error: Response; user?: undefined; admin?: undefined }
  | { error?: undefined; user: { id: string; email?: string | null }; admin: AdminClient };

export async function authenticateAdmin(req: Request, corsHeaders: Record<string, string>, rateLimitKey: string): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }

  const supaAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await supaAuth.auth.getUser();
  if (userError || !user) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY) as AdminClient;

  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin"]);
  if (!roles?.length) {
    return { error: new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }

  const { data: isLimited } = await admin.rpc('check_rate_limit', {
    p_key: `${rateLimitKey}:${user.id}`, p_limit: 30, p_window_seconds: 60
  });
  if (isLimited) {
    return { error: new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح من الطلبات. حاول بعد دقيقة." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }

  return { user, admin };
}
