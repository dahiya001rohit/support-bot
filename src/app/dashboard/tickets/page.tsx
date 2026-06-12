"use client";

import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Ticket } from "lucide-react";
import { toast } from "sonner";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type TicketPriority = "urgent" | "high" | "medium" | "low";

type TicketItem = {
  id: string;
  customer_name: string;
  customer_email: string;
  query: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
};

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_DOT: Record<TicketPriority, string> = {
  urgent: "text-red-500",
  high:   "text-orange-500",
  medium: "text-blue-500",
  low:    "text-muted-foreground",
};

const STATUS_DOT: Record<TicketStatus, string> = {
  open:        "text-amber-500",
  in_progress: "text-blue-500",
  resolved:    "text-emerald-500",
  closed:      "text-muted-foreground",
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const PRIORITY_SUMMARY: Record<TicketPriority, { dot: string; label: string }> = {
  urgent: { dot: "bg-red-500",    label: "Urgent" },
  high:   { dot: "bg-orange-500", label: "High" },
  medium: { dot: "bg-blue-500",   label: "Medium" },
  low:    { dot: "bg-muted-foreground/40", label: "Low" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      const r = await fetch(`/api/tickets?${params}`);
      if (!r.ok) throw new Error("Failed to load tickets");
      setTickets(await r.json());
    } catch {
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  async function updateStatus(ticketId: string, newStatus: TicketStatus) {
    setUpdatingId(ticketId);
    try {
      const r = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!r.ok) throw new Error("Failed to update status");
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
      );
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  const summaryCounts = (["urgent", "high", "medium", "low"] as TicketPriority[]).map((p) => ({
    priority: p,
    count: tickets.filter((t) => t.priority === p).length,
    ...PRIORITY_SUMMARY[p],
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-[-0.02em]">Tickets</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage and update support tickets
        </p>
      </div>

      {/* Priority summary chips */}
      <div className="flex flex-wrap gap-2">
        {summaryCounts.map(({ priority, count, dot, label }) => (
          <span
            key={priority}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[12px] font-medium"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            {label}
            <span className="text-muted-foreground">{count}</span>
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            {STATUS_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-[12px]">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36 h-8 text-[13px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table — no card chrome */}
      <div className="border-t border-border">
        {loading ? (
          <div className="space-y-px pt-px">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 px-1">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-40 ml-auto" />
              </div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Ticket className="size-8 text-muted-foreground/20 mb-2" />
            <p className="text-sm text-muted-foreground">No tickets found</p>
            <p className="text-[12px] text-muted-foreground/60 mt-0.5">Try adjusting the filters</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Query</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id} className="hover:bg-accent/50">
                  <TableCell className="font-medium text-[13px] whitespace-nowrap">
                    {ticket.customer_name}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-[13px] text-muted-foreground">
                    {ticket.customer_email}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <span className="line-clamp-2 text-[13px] text-muted-foreground">
                      {ticket.query}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${PRIORITY_DOT[ticket.priority]}`}>
                      ●
                      <span className="text-foreground">
                        {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={ticket.status}
                      onValueChange={(v) => updateStatus(ticket.id, v as TicketStatus)}
                      disabled={updatingId === ticket.id}
                    >
                      <SelectTrigger className="h-7 w-32 text-[12px] border-border">
                        <span className={`inline-flex items-center gap-1.5 ${STATUS_DOT[ticket.status]}`}>
                          ● <span className="text-foreground">{STATUS_LABEL[ticket.status]}</span>
                        </span>
                      </SelectTrigger>
                      <SelectContent position="popper" side="bottom" align="start">
                        <SelectItem value="open"> Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed"> Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-[13px] text-muted-foreground whitespace-nowrap">
                    {formatDate(ticket.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
