import { createClient } from "@supabase/supabase-js";

import type { getConfig } from "../config.js";

type Config = ReturnType<typeof getConfig>;

export function createSupabaseClient(config: Config) {
  return createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createUserSupabaseClient(
  config: Config,
  accessToken: string,
) {
  return createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}
