import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { customer_name, customer_email, business_id } = await req.json();

  if (!customer_name?.trim() || !customer_email?.includes("@") || !business_id) {
    return NextResponse.json({ error: "valid name, email, business_id required" }, { status: 400, headers: corsHeaders });
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("tickets")
    .update({ customer_name: customer_name.trim(), customer_email: customer_email.trim() })
    .eq("id", id)
    .eq("business_id", business_id)
    .eq("customer_name", "Anonymous");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }



  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}