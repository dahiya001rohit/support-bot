const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type BotReply = {
  reply: string;
  should_escalate: boolean;
  priority: "urgent" | "high" | "medium" | "low";
  reason: string;
};

interface GroqResponse {
  id: string;                    // "chatcmpl-abc123"
  object: "chat.completion";
  created: number;               // unix timestamp
  model: string;                 // "llama-3.3-70b-versatile"
  choices: {
    index: number;               // 0
    message: {
      role: "assistant";
      content: string;           // ← THE reply text (JSON string in our case)
    };
    finish_reason: "stop" | "length" | "tool_calls";
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function getBotReply(
  messages: ChatMessage[]
): Promise<BotReply> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq failed: ${res.status} ${err}`);
  }

  const data: GroqResponse = await res.json();
  const raw = data.choices[0].message.content;

  try {
    const parsed = JSON.parse(raw);
    return {
      reply: parsed.reply ?? "Sorry, something went wrong. Please try again.",
      should_escalate: Boolean(parsed.should_escalate),
      priority: ["urgent", "high", "medium", "low"].includes(parsed.priority)
        ? parsed.priority
        : "medium",
      reason: parsed.reason ?? "",
    };
  } catch {
    return {
      reply: raw,
      should_escalate: false,
      priority: "medium",
      reason: "json_parse_failed",
    };
  }
}