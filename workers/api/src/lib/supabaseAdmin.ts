import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../env";

/**
 * Service-role client — bypasses RLS. Every query built on top of this
 * MUST filter by a family_id that came from the auth middleware (JWT),
 * never from the client request body. See specs/adr/0003.
 */
export function supabaseAdmin(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
