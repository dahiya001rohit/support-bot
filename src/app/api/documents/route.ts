import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { parseFile } from "@/lib/parser";
import { chunkText } from "@/lib/chunker";
import { embedBatch } from "@/lib/embeddings";

const ALLOWED_TYPES = ["pdf", "docx", "txt", "md"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const businessId = formData.get("business_id") as string | null;

    if (!file || !businessId) {
      return NextResponse.json(
        { error: "file and business_id are required" },
        { status: 400 }
      );
    }

    const fileType = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_TYPES.includes(fileType)) {
      return NextResponse.json(
        { error: `Unsupported file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin();

    // 1. create document row (status: processing)
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({
        business_id: businessId,
        filename: file.name,
        file_type: fileType,
      })
      .select()
      .single();

    if (docError) throw new Error(docError.message);

    try {
      // 2. parse file → text
      const buffer = Buffer.from(await file.arrayBuffer());
      const text = await parseFile(buffer, fileType);

      if (!text || text.length < 20) {
        throw new Error("No readable text found in file");
      }

      // 3. chunk text
      const chunks = chunkText(text);

      // 4. embed all chunks in one batch
      const vectors = await embedBatch(chunks);

      // 5. insert chunks with embeddings
      const rows = chunks.map((content, i) => ({
        business_id: businessId,
        document_id: doc.id,
        content,
        embedding: JSON.stringify(vectors[i]),
      }));

      const { error: chunkError } = await supabase.from("chunks").insert(rows);
      if (chunkError) throw new Error(chunkError.message);

      // 6. mark document ready
      await supabase
        .from("documents")
        .update({ status: "ready", chunk_count: chunks.length })
        .eq("id", doc.id);

      return NextResponse.json({
        id: doc.id,
        filename: file.name,
        status: "ready",
        chunks: chunks.length,
      });
    } catch (processingError) {
      // pipeline failed → mark document failed, don't leave it stuck in processing
      await supabase
        .from("documents")
        .update({ status: "failed" })
        .eq("id", doc.id);
      throw processingError;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("business_id");
  if (!businessId) {
    return NextResponse.json({ error: "business_id required" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}