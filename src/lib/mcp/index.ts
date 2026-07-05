/**
 * تعريف خادم MCP الخاص بنظام إدارة وقف مرزوق بن علي الثبيتي.
 * يُصدَّر إلى Supabase Edge Function عبر mcpPlugin() في vite.config.ts.
 *
 * ملاحظة: هذا الملف يُستدعى خلال build و cold-start بدون secrets؛
 * لا تقرأ env ولا تُنفّذ I/O على المستوى الأعلى.
 */
import { defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import publicStatsTool from "./tools/get-public-stats";

export default defineMcp({
  name: "waqf-wise-mcp",
  title: "Waqf Wise — Marzouq Al-Thubaiti Waqf",
  version: "0.1.0",
  instructions:
    "Public tools for Marzouq bin Ali Al-Thubaiti Waqf management system. " +
    "Use `echo` to verify connectivity and `get_public_waqf_stats` to read publicly disclosed statistics.",
  tools: [echoTool, publicStatsTool],
});
