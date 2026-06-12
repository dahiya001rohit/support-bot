"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Ticket, CheckCircle, AlertTriangle, Zap } from "lucide-react";

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

function StatCard({
  title,
  value,
  icon: Icon,
  iconClass,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconClass: string;
  description?: string;
}) {
  return (
    <Card className="border border-border">
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {title}
          </span>
          <div className={`h-6 w-6 rounded-md flex items-center justify-center ${iconClass}`}>
            <Icon className="size-3.5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums tracking-[-0.02em]">{value}</div>
        {description && (
          <p className="text-[12px] text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="border border-border">
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-6 rounded-md" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-3 w-20 mt-2" />
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load analytics");
        return r.json();
      })
      .then(setAnalytics)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-[-0.02em]">Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Overview of your AI support activity
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : analytics ? (
          <>
            <StatCard
              title="Total Conversations"
              value={analytics.total_conversations.toLocaleString()}
              icon={MessageSquare}
              iconClass="bg-primary/10 text-primary"
              description="All-time chat sessions"
            />
            <StatCard
              title="Open Tickets"
              value={analytics.open_tickets.toLocaleString()}
              icon={Ticket}
              iconClass="bg-amber-500/10 text-amber-500"
              description={`${analytics.total_tickets} total`}
            />
            <StatCard
              title="Resolved Tickets"
              value={analytics.resolved_tickets.toLocaleString()}
              icon={CheckCircle}
              iconClass="bg-emerald-500/10 text-emerald-500"
              description="Successfully closed"
            />
            <StatCard
              title="Escalated"
              value={analytics.escalated_conversations.toLocaleString()}
              icon={AlertTriangle}
              iconClass="bg-rose-500/10 text-rose-500"
              description="Needed human handoff"
            />
            <Card className="border border-border sm:col-span-2 xl:col-span-1">
              <CardHeader className="pb-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    AI Resolution Rate
                  </span>
                  <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <Zap className="size-3.5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums tracking-[-0.02em]">
                  {analytics.ai_resolution_rate.toFixed(1)}%
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(analytics.ai_resolution_rate, 100)}%` }}
                  />
                </div>
                <p className="text-[12px] text-muted-foreground mt-1.5">
                  Resolved without escalation
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
