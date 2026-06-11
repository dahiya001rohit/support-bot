import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getBusinessIdFromSession } from "@/lib/auth";

export async function GET() {
    const businessId = await getBusinessIdFromSession();
    if (!businessId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = supabaseAdmin();
    const { data, error } = await supabase
        .from("bot_configs")
        .select("*")
        .eq("business_id", businessId)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {

    const businessId = await getBusinessIdFromSession();
    if (!businessId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { bot_name, welcome_message, personality, escalation_rules } =
        await req.json();

    if (!businessId) {
        return NextResponse.json({ error: "business_id required" }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    const { data, error } = await supabase
        .from("bot_configs")
        .update({ bot_name, welcome_message, personality, escalation_rules })
        .eq("business_id", businessId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
}