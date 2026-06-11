import { supabaseAdmin } from "./supabase/server";
import { embedText } from "./embeddings";

export async function searchChunks(
  businessId: string,
  query: string,
  limit = 5
): Promise<string[]> {
  const queryVector = await embedText(query);
  const supabase = supabaseAdmin();

  const { data, error } = await supabase.rpc("match_chunks", {
    p_business_id: businessId,
    p_query_embedding: JSON.stringify(queryVector),
    p_match_count: limit,
  });

  if (error) throw new Error(`Vector search failed: ${error.message}`);
  return (data ?? []).map((row: { content: string }) => row.content);
}

export function buildSystemPrompt(config: {
  bot_name: string;
  personality: string;
  escalation_rules: string;
  welcome_message: string;
}, chunks: string[]): string {
  return `You are ${config.bot_name}, a customer support assistant. Your tone is ${config.personality}.

KNOWLEDGE BASE (your only source of truth):
${chunks.length ? chunks.map((c, i) => `[${i + 1}] ${c}`).join("\n\n") : "No relevant documents found."}

RULES:
- Answer ONLY using the knowledge base above. If the answer is not there, say you don't have that information and set should_escalate to true with reason "no_answer_found".
- Never invent facts, prices, policies, or links.
- ESCALATION RULES set by the business admin: ${config.escalation_rules}
Escalate only when the customer REQUESTS an action or expresses the listed conditions — not when they merely ask informational questions about policies.
- If any escalation rule matches the customer's message, set should_escalate to true.

You MUST respond with valid JSON in exactly this format:
{"reply": string, "should_escalate": boolean, "priority": "urgent" | "high" | "medium" | "low", "reason": string}

The reply field supports markdown (bullet lists, tables, links, bold).`;
}