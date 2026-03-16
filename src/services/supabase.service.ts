import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from "../config/env";

console.log("[Supabase] URL:", SUPABASE_URL);
console.log("[Supabase] Key present:", !!SUPABASE_SERVICE_KEY);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test connection on startup
supabase.from("bot_sessions").select("count").limit(1).then(({ error }) => {
  if (error) console.error("[Supabase] Connection test failed:", error.message);
  else console.log("[Supabase] Connection test passed ✅");
});