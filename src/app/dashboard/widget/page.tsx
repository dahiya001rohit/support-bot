"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Code2, Copy, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function WidgetPage() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/me")
      .then((r) => { if (!r.ok) throw new Error("Failed to load business ID"); return r.json(); })
      .then((data) => setBusinessId(data.business_id))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const snippet = businessId && origin
    ? `<script\n  src="${origin}/widget.js"\n  data-business-id="${businessId}"\n  data-api-url="${origin}"\n></script>`
    : "";

  async function copySnippet() {
    if (!snippet) return;
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-[-0.02em]">Get Widget Code</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add the chat widget to any website with a single script tag
        </p>
      </div>

      <Card className="border border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Code2 className="size-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Embed snippet
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-[13px] text-muted-foreground">
            Paste before the closing{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[12px] font-mono text-foreground">
              &lt;/body&gt;
            </code>{" "}
            tag on any page where you want the support widget.
          </p>

          {loading ? (
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden" style={{ background: "#0e0f11" }}>
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/6">
                <span className="text-[11px] font-mono text-white/40">HTML</span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={copySnippet}
                  className="text-white/40 hover:text-white hover:bg-white/8"
                >
                  {copied ? (
                    <><Check className="size-3" /> Copied</>
                  ) : (
                    <><Copy className="size-3" /> Copy</>
                  )}
                </Button>
              </div>
              <pre className="p-4 text-[13px] font-mono text-primary overflow-x-auto whitespace-pre leading-relaxed">
                {snippet}
              </pre>
            </div>
          )}

          {businessId && (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
              <p className="text-[12px] text-muted-foreground">
                <span className="font-medium text-foreground">Business ID</span>{" "}
                <code className="font-mono">{businessId}</code>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader className="pb-2">
          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            How it works
          </span>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {[
              "Copy the snippet above and paste it into your website's HTML.",
              "The widget loads automatically and shows a chat button in the bottom-right corner.",
              "Visitors click to open the chat and receive instant AI-powered support.",
              "Complex queries are escalated and appear as tickets in your dashboard.",
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-primary/10 text-[11px] font-bold text-primary">
                  {i + 1}
                </span>
                <span className="text-[13px] text-muted-foreground leading-relaxed">{text}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
