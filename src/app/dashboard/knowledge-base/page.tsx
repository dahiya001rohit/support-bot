"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, FileText, AlertCircle, Loader2, CloudUpload } from "lucide-react";
import { toast } from "sonner";

type Document = {
  id: string;
  filename: string;
  file_type: string;
  status: "processing" | "ready" | "failed";
  chunk_count: number;
  created_at: string;
};

const STATUS_DOT: Record<Document["status"], string> = {
  processing: "text-amber-500",
  ready: "text-emerald-500",
  failed: "text-destructive",
};

const STATUS_LABEL: Record<Document["status"], string> = {
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function KnowledgeBasePage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadDocs() {
    try {
      const r = await fetch("/api/documents");
      if (!r.ok) throw new Error("Failed to load documents");
      setDocs(await r.json());
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDocs(); }, []);

  async function uploadFile(file: File) {
    const ACCEPTED = [".pdf", ".docx", ".txt", ".md"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      toast.error(`Unsupported file type. Accepted: ${ACCEPTED.join(", ")}`);
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/documents", { method: "POST", body: form });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error ?? "Upload failed");
      }
      toast.success(`"${file.name}" uploaded and queued for processing`);
      loadDocs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/documents/${deleteId}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Delete failed");
      toast.success("Document deleted");
      setDeleteId(null);
      setDocs((prev) => prev.filter((d) => d.id !== deleteId));
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-[-0.02em]">Knowledge Base</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Upload documents to train your support bot
        </p>
      </div>

      {/* Upload zone */}
      <div
        role="button"
        tabIndex={0}
        className={`rounded-lg border-2 border-dashed transition-colors cursor-pointer select-none ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !uploading && fileRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
            onChange={onFileChange}
          />
          {uploading ? (
            <>
              <Loader2 className="size-8 text-primary animate-spin mb-2" />
              <p className="text-sm font-medium">Uploading…</p>
            </>
          ) : (
            <>
              <CloudUpload className="size-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">
                Drop a file, or <span className="text-primary">browse</span>
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">
                PDF, DOCX, TXT, MD
              </p>
            </>
          )}
        </div>
      </div>

      {/* Documents table — no card chrome */}
      <div>
        <div className="flex items-center justify-between pb-2">
          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Documents
          </span>
          <span className="text-[12px] text-muted-foreground">{docs.length} file{docs.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="border-t border-border">
          {loading ? (
            <div className="space-y-px pt-px">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3 px-1">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-12 ml-auto" />
                </div>
              ))}
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <FileText className="size-8 text-muted-foreground/20 mb-2" />
              <p className="text-sm text-muted-foreground">No documents yet</p>
              <p className="text-[12px] text-muted-foreground/60 mt-0.5">
                Upload a file above to get started
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Chunks</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-accent/50">
                    <TableCell className="font-medium max-w-xs truncate text-[13px]">
                      {doc.filename}
                    </TableCell>
                    <TableCell>
                      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {doc.file_type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 text-[13px] ${STATUS_DOT[doc.status]}`}>
                        {doc.status === "processing" ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <span>●</span>
                        )}
                        {STATUS_LABEL[doc.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-[13px] text-muted-foreground">
                      {doc.chunk_count ?? "—"}
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">
                      {formatDate(doc.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(doc.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete document</DialogTitle>
            <DialogDescription>
              This will permanently remove the document and all its indexed chunks.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <><Loader2 className="size-3.5 animate-spin" /> Deleting…</> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
