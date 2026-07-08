/**
 * تعريف خادم MCP الخاص بنظام إدارة وقف مرزوق بن علي الثبيتي.
 * محمي عبر OAuth 2.1 من Supabase Auth — لا وصول بدون تسجيل دخول.
 *
 * ملاحظة: هذا الملف يُستدعى خلال build و cold-start بدون secrets؛
 * لا تقرأ env ولا تُنفّذ I/O على المستوى الأعلى.
 */
import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import publicStatsTool from "./tools/get-public-stats";

// معرّف مشروع Supabase مُضمَّن كـ literal في وقت البناء عبر Vite.
// نبني issuer مباشرة من supabase.co (لا نستخدم SUPABASE_URL الذي قد يكون proxy).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "waqf-wise-mcp",
  title: "Waqf Wise — Marzouq Al-Thubaiti Waqf",
  version: "0.1.0",
  instructions:
    "Authenticated tools for Marzouq bin Ali Al-Thubaiti Waqf management system. " +
    "Sign in as a user of the app to use `echo` and `get_public_waqf_stats`.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [echoTool, publicStatsTool],
});
