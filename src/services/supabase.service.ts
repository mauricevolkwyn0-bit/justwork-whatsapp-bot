import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from "../config/env";

// Service role client — bypasses RLS, only use in backend
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);