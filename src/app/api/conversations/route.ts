import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getBusinessIdFromSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const businessId = await getBusinessIdFromSession();
    if (!businessId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const search = req.nextUrl.searchParams.get("search");
    const conversationId = req.nextUrl.searchParams.get("conversation_id");


    const supabase = supabaseAdmin();

    // single conversation → return its messages
    if (conversationId) {
        const { data, error } = await supabase
        .from("messages")
        .select("role, content, created_at")
        .eq("conversation_id", conversationId)
        .eq("business_id", businessId)
        .order("created_at", { ascending: true });

        if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json(data);
    }

    // search in message content → return matching conversations
    if (search) {
        const { data, error } = await supabase
        .from("messages")
        .select("conversation_id, content, conversations!inner(id, session_id, escalated, created_at)")
        .eq("business_id", businessId)
        .ilike("content", `%${search}%`)
        .limit(50);

        if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
        }
        const seen = new Set<string>();
        const unique = (data ?? []).filter((m) => {
            if (!m.conversation_id) return false;
            if (seen.has(m.conversation_id)) return false;
            seen.add(m.conversation_id);
            return true;
        });
        return NextResponse.json(unique.map((m) => m.conversations));
    }

    // default: list all conversations
    const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
}