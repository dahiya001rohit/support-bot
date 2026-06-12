"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart2, TrendingUp, AlertTriangle, Ticket } from "lucide-react";
import { toast } from "sonner";

type Analytics = {
  total_conversations: number;
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  resolved_tickets: number;
  closed_tickets: number;
  escalated_conversations: number;
  escalation_rate: number;
  ai_resolution_rate: number;
};

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] text-muted-foreground w-7 text-right tabular-nums">{value}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => toast.error("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <div>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-48 mt-1" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border border-border">
              <CardContent className="pt-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const ticketStatuses = [
    { label: "Open",        value: data.open_tickets,        color: "bg-amber-500" },
    { label: "In Progress", value: data.in_progress_tickets, color: "bg-blue-500" },
    { label: "Resolved",    value: data.resolved_tickets,    color: "bg-emerald-500" },
    { label: "Closed",      value: data.closed_tickets,      color: "bg-muted-foreground/40" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-[-0.02em]">Analytics</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Performance overview for your AI support bot
        </p>
      </div>

      {/* Rate cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border border-border">
          <CardHeader className="pb-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <TrendingUp className="size-3.5" />
              </div>
              <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                AI Resolution Rate
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold tabular-nums tracking-[-0.02em]">
              {data.ai_resolution_rate.toFixed(1)}%
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(data.ai_resolution_rate, 100)}%` }}
              />
            </div>
            <p className="text-[12px] text-muted-foreground">
              {data.total_conversations - data.escalated_conversations} of{" "}
              {data.total_conversations} resolved by AI
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <AlertTriangle className="size-3.5" />
              </div>
              <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Escalation Rate
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold tabular-nums tracking-[-0.02em]">
              {data.escalation_rate.toFixed(1)}%
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-rose-500 transition-all"
                style={{ width: `${Math.min(data.escalation_rate, 100)}%` }}
              />
            </div>
            <p className="text-[12px] text-muted-foreground">
              {data.escalated_conversations} of {data.total_conversations} escalated
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ticket breakdown */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Ticket className="size-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Ticket Status Breakdown
            </span>
            <span className="ml-auto text-[12px] text-muted-foreground">{data.total_tickets} total</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {ticketStatuses.map(({ label, value, color }) => (
            <div key={label} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">{label}</span>
                <span className="text-[12px] text-muted-foreground tabular-nums">
                  {data.total_tickets > 0 ? ((value / data.total_tickets) * 100).toFixed(0) : 0}%
                </span>
              </div>
              <Bar value={value} max={data.total_tickets} color={color} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Conversations proportion bar */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart2 className="size-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Conversations Overview
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              AI Resolved
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              Escalated
            </span>
          </div>
          {data.total_conversations > 0 ? (
            <div className="h-5 w-full rounded-md overflow-hidden flex">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${((data.total_conversations - data.escalated_conversations) / data.total_conversations) * 100}%` }}
              />
              <div
                className="h-full bg-rose-500 transition-all"
                style={{ width: `${(data.escalated_conversations / data.total_conversations) * 100}%` }}
              />
            </div>
          ) : (
            <div className="h-5 w-full rounded-md bg-muted" />
          )}
          <div className="flex items-center justify-between text-[12px] text-muted-foreground">
            <span>{data.total_conversations - data.escalated_conversations} AI resolved</span>
            <span>{data.escalated_conversations} escalated</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
