import { createClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";

export function supabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}
