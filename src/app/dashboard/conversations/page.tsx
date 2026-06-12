"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageSquare, Search, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";

type Conversation = {
  id: string;
  session_id: string;
  escalated: boolean;
  created_at: string;
};

type Message = {
  role: string;
  content: string;
  created_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function shortSessionId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      const r = await fetch(`/api/conversations?${params}`);
      if (!r.ok) throw new Error("Failed to load conversations");
      setConversations(await r.json());
    } catch {
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  async function openConversation(id: string) {
    setSelectedId(id);
    setMessagesLoading(true);
    setMessages([]);
    try {
      const r = await fetch(`/api/conversations?conversation_id=${id}`);
      if (!r.ok) throw new Error("Failed to load messages");
      setMessages(await r.json());
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setMessagesLoading(false);
    }
  }

  useEffect(() => {
    if (messages.length > 0) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedConv = conversations.find((c) => c.id === selectedId);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-[-0.02em]">Conversations</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Browse and review customer chat sessions
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Search conversations…"
          className="pl-8 h-8 text-[13px]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearch("")}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* List — no card chrome */}
      <div className="border-t border-border">
        {loading ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-0 py-3 border-b border-border">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <MessageSquare className="size-8 text-muted-foreground/20 mb-2" />
            <p className="text-sm text-muted-foreground">
              {debouncedSearch ? "No conversations match your search" : "No conversations yet"}
            </p>
            {debouncedSearch && (
              <button className="text-[12px] text-primary hover:underline mt-1" onClick={() => setSearch("")}>
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div>
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv.id)}
                className="w-full flex items-center justify-between px-0 py-3 border-b border-border hover:bg-accent/50 transition-colors text-left group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-mono font-medium">
                      #{shortSessionId(conv.session_id)}
                    </span>
                    {conv.escalated && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500">
                        <AlertTriangle className="size-3" />
                        Escalated
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {formatDate(conv.created_at)}
                  </p>
                </div>
                <span className="text-[12px] text-muted-foreground group-hover:text-foreground transition-colors shrink-0 ml-4">
                  View →
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Thread dialog */}
      <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-xl max-h-[75vh] flex flex-col p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2 text-[13px] font-medium">
              <MessageSquare className="size-3.5 text-muted-foreground" />
              Session #{selectedConv ? shortSessionId(selectedConv.session_id) : ""}
              {selectedConv?.escalated && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500">
                  <AlertTriangle className="size-3" /> Escalated
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0 bg-background">
            {messagesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                    <Skeleton className="h-12 w-48 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-24">
                <p className="text-[13px] text-muted-foreground">No messages in this session</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isUser = msg.role === "user";
                return (
                  <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[76%] rounded-xl px-3.5 py-2 text-[13px] leading-relaxed ${
                        isUser
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
