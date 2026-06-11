import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("business_id");
  const status = req.nextUrl.searchParams.get("status");
  const priority = req.nextUrl.searchParams.get("priority");

  if (!businessId) {
    return NextResponse.json({ error: "business_id required" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  let query = supabase
    .from("tickets")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (priority) query = query.eq("priority", priority);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}