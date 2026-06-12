import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { searchChunks, buildSystemPrompt } from "@/lib/rag";
import { getBotReply } from "@/lib/groq";
import { withErrorHandler } from "@/lib/api-handler";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  return withErrorHandler(async () => {
    try {
    const { business_id, session_id, message } = await req.json();

    if (!business_id || !session_id || !message?.trim()) {
      return NextResponse.json(
        { error: "business_id, session_id and message are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = supabaseAdmin();

    // 1. load bot config
    const { data: config, error: configError } = await supabase
      .from("bot_configs")
      .select("*")
      .eq("business_id", business_id)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { error: "Bot not found for this business" },
        { status: 404, headers: corsHeaders }
      );
    }

    // 2. find or create conversation
    let { data: conversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("session_id", session_id)
      .eq("business_id", business_id)
      .single();

    if (!conversation) {
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({ business_id, session_id })
        .select()
        .single();
      if (convError) throw new Error(convError.message);
      conversation = newConv;
    }

    // 3. load recent history (before saving new message)
    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(20);

    // 4. save user message
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      business_id,
      role: "user",
      content: message,
    });

    // 5. RAG: retrieve relevant chunks
    const chunks = await searchChunks(business_id, message);

    // 6. build prompt + call LLM
    const systemPrompt = buildSystemPrompt(config, chunks);
    const botReply = await getBotReply([
      { role: "system", content: systemPrompt },
      ...(history ?? []).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ]);

    // 7. save assistant message
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      business_id,
      role: "assistant",
      content: botReply.reply,
    });

    // 8. escalation → create ticket (if not already escalated)
    let ticketCreated = false;
    let ticketId: string | null = null;
    if (botReply.should_escalate && !conversation.escalated) {
    const { data: ticket } = await supabase
        .from("tickets")
        .insert({
        business_id,
        conversation_id: conversation.id,
        customer_name: conversation.customer_name ?? "Anonymous",
        customer_email: conversation.customer_email ?? "not-provided",
        query: message,
        priority: botReply.priority,
        })
        .select("id")
        .single();

    ticketId = ticket?.id ?? null;

    await supabase
        .from("conversations")
        .update({ escalated: true })
        .eq("id", conversation.id);

    ticketCreated = true;
    }
    await supabase.from("messages").insert({
        conversation_id: conversation.id,
        business_id,
        role: "system",
        content: `Ticket created — priority: ${botReply.priority}. Reason: ${botReply.reason}`,
    });
    // 9. respond to widget
    return NextResponse.json(
        {
            reply: botReply.reply,
            escalated: botReply.should_escalate,
            ticket_created: ticketCreated,
            ticket_id: ticketId,
        },
        { headers: corsHeaders }
    );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Chat failed";
      return NextResponse.json(
        { error: message },
        { status: 500, headers: corsHeaders }
      );
    }
  });
}