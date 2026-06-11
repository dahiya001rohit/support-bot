export function chunkText(
  text: string,
  chunkSize = 1500,
  overlap = 200
): string[] {
  if (text.length <= chunkSize) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    if (end < text.length) {
      const breakPoint = text.lastIndexOf("\n", end);
      if (breakPoint > start + chunkSize * 0.5) {
        end = breakPoint;
      } else {
        const sentenceBreak = text.lastIndexOf(". ", end);
        if (sentenceBreak > start + chunkSize * 0.5) end = sentenceBreak + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }

  return chunks.filter((c) => c.length > 50);
}