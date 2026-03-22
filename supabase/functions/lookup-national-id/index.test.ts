import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";

// Read env vars from .env file manually (avoid dotenv strict mode)
const envText = await Deno.readTextFile(".env").catch(() => "");
const envMap: Record<string, string> = {};
for (const line of envText.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) envMap[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = envMap["VITE_SUPABASE_URL"] || Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = envMap["VITE_SUPABASE_PUBLISHABLE_KEY"] || Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/lookup-national-id`;

const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
};

Deno.test("GET request should be rejected", async () => {
  const res = await fetch(FUNCTION_URL, { method: "GET", headers });
  const body = await res.text();
  // GET should fail (either 405 or 500 since body parsing fails)
  assert(res.status >= 400, `Expected 4xx/5xx, got ${res.status}: ${body}`);
});

Deno.test("Missing body should return error", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  const data = await res.json();
  // No national_id → 400
  assertEquals(res.status, 400);
  assert(data.error !== undefined);
});

Deno.test("Short national ID should return 400", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ national_id: "12345" }),
  });
  const data = await res.json();
  assertEquals(res.status, 400);
  assert(data.error.includes("10"));
});

Deno.test("Non-existent ID returns found:true (anti-enumeration)", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ national_id: "9999999999" }),
  });
  const data = await res.json();
  assertEquals(res.status, 200);
  assertEquals(data.found, true);
  // Masked email should be generic placeholder
  assert(data.masked_email !== undefined);
});

Deno.test("Arabic-Indic digits are normalized", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ national_id: "٩٩٩٩٩٩٩٩٩٩" }),
  });
  const data = await res.json();
  // Should be normalized to 9999999999 and processed normally
  assertEquals(res.status, 200);
  assertEquals(data.found, true);
});
