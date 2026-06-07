/**
 * Entry point — منسّق إقلاع فقط (P4).
 * كل خطوة side-effect معزولة تحت src/app/bootstrap/.
 */
import "./index.css";
import { initThemeFromStorage } from "@/lib/theme/themeColor.utils";
import { initQueryMonitoring } from "@/lib/initQueryMonitoring";
import { removeSplash } from "@/app/bootstrap/removeSplash";
import { preconnectBackend } from "@/app/bootstrap/preconnectBackend";
import { registerPwa } from "@/app/bootstrap/registerPwa";
import { initDeferredMonitoring } from "@/app/bootstrap/initMonitoring";
import { mountReact } from "@/app/bootstrap/mountReact";
import { installRuntimeCollector } from "@/lib/diagnostics/runtimeCollector";

// ─── Pre-render setup ───
initThemeFromStorage();
initQueryMonitoring();
preconnectBackend();
registerPwa();
installRuntimeCollector();

// ─── Mount + cleanup ───
try {
  mountReact();
} finally {
  removeSplash();
}

// ─── Deferred (idle) ───
initDeferredMonitoring();
