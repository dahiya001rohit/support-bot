import mammoth from "mammoth";

export async function parseFile(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  switch (fileType) {
    case "pdf": {
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const result = await parser.getText();
        await parser.destroy();
        return clean(result.text);
    }
    case "docx": {
      const result = await mammoth.extractRawText({ buffer });
      return clean(result.value);
    }
    case "txt":
    case "md":
      return clean(buffer.toString("utf-8"));
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

function clean(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}