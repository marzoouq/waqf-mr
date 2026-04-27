/**
 * WebAuthn Edge Function — Dispatcher رفيع.
 * المنطق الفعلي في handlers/*.ts و helpers.ts
 */
import { getCorsHeaders } from "../_shared/cors.ts";
import { getSupabaseAdmin, getRpInfo } from "./helpers.ts";
import { handleRegisterOptions } from "./handlers/register-options.ts";
import { handleRegisterVerify } from "./handlers/register-verify.ts";
import { handleAuthOptions } from "./handlers/auth-options.ts";
import { handleAuthVerify } from "./handlers/auth-verify.ts";

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const { action, ...body } = await req.json();
    const admin = getSupabaseAdmin();
    const rp = getRpInfo(req);

    switch (action) {
      case "register-options":
        return await handleRegisterOptions(req, admin, rp, cors);
      case "register-verify":
        return await handleRegisterVerify(req, admin, rp, body, cors);
      case "auth-options":
        return await handleAuthOptions(req, admin, rp, cors);
      case "auth-verify":
        return await handleAuthVerify(admin, rp, body, cors);
      default:
        return new Response(JSON.stringify({ error: "إجراء غير معروف" }), { status: 400, headers: cors });
    }
  } catch (err) {
    console.error("WebAuthn error:", err instanceof Error ? err.message : "Unknown error");
    return new Response(JSON.stringify({ error: "حدث خطأ داخلي" }), { status: 500, headers: getCorsHeaders(req) });
  }
});
