const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001";

export async function embedText(text: string): Promise<number[]> {
  const res = await fetch(
    `${GEMINI_URL}:embedContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text }] },
        output_dimensionality: 768
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.embedding.values;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch(
    `${GEMINI_URL}:batchEmbedContents?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text }] },
          output_dimensionality: 768
        })),
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Batch embedding failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.embeddings.map((e: { values: number[] }) => e.values);
}