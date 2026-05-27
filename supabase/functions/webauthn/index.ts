/**
 * WebAuthn Edge Function — Dispatcher رفيع.
 * المنطق الفعلي في handlers/*.ts و helpers.ts
 *
 * التحقق من بنية الـ body يتم هنا (Zod) قبل التمرير للـ handlers.
 * الـ credential نفسه (PublicKeyCredential) بنية معقدة يُتحقق منها
 * cryptographically داخل @simplewebauthn/server في كل handler.
 */
import { getCorsHeaders } from "../_shared/cors.ts";
import { getSupabaseAdmin, getRpInfo } from "./helpers.ts";
import { handleRegisterOptions } from "./handlers/register-options.ts";
import { handleRegisterVerify } from "./handlers/register-verify.ts";
import { handleAuthOptions } from "./handlers/auth-options.ts";
import { handleAuthVerify } from "./handlers/auth-verify.ts";
import { z } from "npm:zod@3";

const ACTIONS = ["register-options", "register-verify", "auth-options", "auth-verify"] as const;

const VerifyBodySchema = z.object({
  credential: z.record(z.unknown()),
  challenge_id: z.string().min(1).max(256),
  deviceName: z.string().max(120).optional(),
});

const DispatchSchema = z.object({
  action: z.enum(ACTIONS),
}).passthrough();

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const raw = await req.json().catch(() => ({}));
    const parsedTop = DispatchSchema.safeParse(raw);
    if (!parsedTop.success) {
      return new Response(
        JSON.stringify({ error: "إجراء غير معروف", details: parsedTop.error.flatten().fieldErrors }),
        { status: 400, headers: cors },
      );
    }
    const { action, ...body } = parsedTop.data as { action: typeof ACTIONS[number]; [k: string]: unknown };
    const admin = getSupabaseAdmin();
    const rp = getRpInfo(req);

    switch (action) {
      case "register-options":
        return await handleRegisterOptions(req, admin, rp, cors);
      case "register-verify": {
        const parsedBody = VerifyBodySchema.safeParse(body);
        if (!parsedBody.success) {
          return new Response(
            JSON.stringify({ error: "بيانات التسجيل غير صالحة", details: parsedBody.error.flatten().fieldErrors }),
            { status: 400, headers: cors },
          );
        }
        return await handleRegisterVerify(req, admin, rp, parsedBody.data, cors);
      }
      case "auth-options":
        return await handleAuthOptions(req, admin, rp, cors);
      case "auth-verify": {
        const parsedBody = VerifyBodySchema.safeParse(body);
        if (!parsedBody.success) {
          return new Response(
            JSON.stringify({ error: "بيانات المصادقة غير صالحة", details: parsedBody.error.flatten().fieldErrors }),
            { status: 400, headers: cors },
          );
        }
        return await handleAuthVerify(admin, rp, parsedBody.data, cors);
      }
    }
  } catch (err) {
    console.error("WebAuthn error:", err instanceof Error ? err.message : "Unknown error");
    return new Response(JSON.stringify({ error: "حدث خطأ داخلي" }), { status: 500, headers: getCorsHeaders(req) });
  }
});

