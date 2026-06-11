import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getBusinessIdFromSession } from "@/lib/auth";

export async function GET() {
    const businessId = await getBusinessIdFromSession();
    if (!businessId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  const supabase = supabaseAdmin();

  const [conversations, tickets, escalated] = await Promise.all([
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId),
    supabase
      .from("tickets")
      .select("status")
      .eq("business_id", businessId),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("escalated", true),
  ]);

  const totalConversations = conversations.count ?? 0;
  const escalatedCount = escalated.count ?? 0;
  const ticketList = tickets.data ?? [];

  const ticketCounts = {
    open: ticketList.filter((t) => t.status === "open").length,
    in_progress: ticketList.filter((t) => t.status === "in_progress").length,
    resolved: ticketList.filter((t) => t.status === "resolved").length,
    closed: ticketList.filter((t) => t.status === "closed").length,
  };

  const totalTickets = ticketList.length;

  return NextResponse.json({
    total_conversations: totalConversations,
    total_tickets: totalTickets,
    open_tickets: ticketCounts.open,
    in_progress_tickets: ticketCounts.in_progress,
    resolved_tickets: ticketCounts.resolved,
    closed_tickets: ticketCounts.closed,
    escalated_conversations: escalatedCount,
    escalation_rate:
      totalConversations > 0
        ? Math.round((escalatedCount / totalConversations) * 100)
        : 0,
    ai_resolution_rate:
      totalConversations > 0
        ? Math.round(
            ((totalConversations - escalatedCount) / totalConversations) * 100
          )
        : 0,
  });
}