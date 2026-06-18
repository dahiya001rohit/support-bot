import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getBusinessIdFromSession } from "@/lib/auth";

type Theme = {
  primary?: string;
  surface?: string;
  userBubble?: string;
  position?: "left" | "right";
  bubbleIcon?: string;
  fontSize?: "small" | "medium" | "large";
  mode?: "dark" | "light";
};

type ConfigUpdateBody = {
  bot_name?: string;
  welcome_message?: string;
  personality?: string;
  escalation_rules?: string;
  suggested_questions?: string[];
  theme?: Theme;
};

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
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {

    const businessId = await getBusinessIdFromSession();
    if (!businessId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { bot_name, welcome_message, personality, escalation_rules, suggested_questions, theme }: ConfigUpdateBody =  await req.json();

    const supabase = supabaseAdmin();
    const updateData: any = { bot_name, welcome_message, personality, escalation_rules, suggested_questions };
    if (theme !== undefined) {
        updateData.theme = theme;
    }
    const { data, error } = await supabase
        .from("bot_configs")
        .update(updateData)
        .eq("business_id", businessId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    return NextResponse.json(data);
}