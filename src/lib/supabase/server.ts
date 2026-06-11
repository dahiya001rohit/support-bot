import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function supabaseAdmin(): SupabaseClient<any, "public", "public", any, any> {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}
