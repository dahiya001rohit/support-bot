import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("business_id");
  if (!businessId) {
    return NextResponse.json({ error: "business_id required" }, { status: 400, headers: corsHeaders });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("bot_configs")
    .select("bot_name, welcome_message, suggested_questions, theme")
    .eq("business_id", businessId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
  }
  return NextResponse.json(data, { headers: corsHeaders });
}