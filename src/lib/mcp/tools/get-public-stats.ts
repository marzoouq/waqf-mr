/**
 * أداة قراءة الإحصائيات العامة للوقف — تعتمد على app_settings العامة فقط.
 * لا PII، لا بيانات مالية خاصة — يتحكم الناظر بما يظهر عبر app_settings.
 */
import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";

type RuntimeGlobal = typeof globalThis & {
  Deno?: { env?: { get?: (key: string) => string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};

const runtimeGlobal = globalThis as RuntimeGlobal;

function getRuntimeEnv(key: string): string | undefined {
  return runtimeGlobal.Deno?.env?.get?.(key) ?? runtimeGlobal.process?.env?.[key];
}

export default defineTool({
  name: "get_public_waqf_stats",
  title: "Get public waqf statistics",
  description:
    "Read publicly disclosed statistics about Marzouq bin Ali Al-Thubaiti Waqf (properties, contracts, beneficiaries) as controlled by the overseer's public disclosure settings.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const url = getRuntimeEnv("SUPABASE_URL");
    const key = getRuntimeEnv("SUPABASE_PUBLISHABLE_KEY") ?? getRuntimeEnv("SUPABASE_ANON_KEY");
    if (!url || !key) {
      return { content: [{ type: "text", text: "Backend not configured" }], isError: true };
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase
      .from("app_settings")
      .select("key,value")
      .like("key", "public_stats_%");
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const stats = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
    return {
      content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
      structuredContent: { stats },
    };
  },
});
