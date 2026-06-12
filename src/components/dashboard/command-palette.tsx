"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  BookOpen,
  Ticket,
  MessageSquare,
  BarChart2,
  Settings,
  Code2,
  Upload,
  Copy,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  function go(href: string) {
    router.push(href);
    onOpenChange(false);
  }

  async function copyWidgetSnippet() {
    onOpenChange(false);
    try {
      const r = await fetch("/api/me");
      if (!r.ok) throw new Error("Could not load business ID");
      const { business_id } = await r.json();
      const origin = window.location.origin;
      const snippet = `<script src="${origin}/widget.js" data-business-id="${business_id}" data-api-url="${origin}"></script>`;
      await navigator.clipboard.writeText(snippet);
      toast.success("Widget snippet copied to clipboard");
    } catch {
      toast.error("Failed to copy snippet");
    }
  }

  async function signOut() {
    onOpenChange(false);
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
    onOpenChange(false);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go("/dashboard")}>
            <LayoutDashboard className="size-3.5 mr-2 text-muted-foreground" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go("/dashboard/knowledge-base")}>
            <BookOpen className="size-3.5 mr-2 text-muted-foreground" />
            Knowledge Base
          </CommandItem>
          <CommandItem onSelect={() => go("/dashboard/tickets")}>
            <Ticket className="size-3.5 mr-2 text-muted-foreground" />
            Tickets
          </CommandItem>
          <CommandItem onSelect={() => go("/dashboard/conversations")}>
            <MessageSquare className="size-3.5 mr-2 text-muted-foreground" />
            Conversations
          </CommandItem>
          <CommandItem onSelect={() => go("/dashboard/analytics")}>
            <BarChart2 className="size-3.5 mr-2 text-muted-foreground" />
            Analytics
          </CommandItem>
          <CommandItem onSelect={() => go("/dashboard/settings")}>
            <Settings className="size-3.5 mr-2 text-muted-foreground" />
            Settings
          </CommandItem>
          <CommandItem onSelect={() => go("/dashboard/widget")}>
            <Code2 className="size-3.5 mr-2 text-muted-foreground" />
            Get Widget Code
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go("/dashboard/knowledge-base")}>
            <Upload className="size-3.5 mr-2 text-muted-foreground" />
            Upload document
          </CommandItem>
          <CommandItem onSelect={copyWidgetSnippet}>
            <Copy className="size-3.5 mr-2 text-muted-foreground" />
            Copy widget snippet
          </CommandItem>
          <CommandItem onSelect={toggleTheme}>
            {theme === "dark" ? (
              <Sun className="size-3.5 mr-2 text-muted-foreground" />
            ) : (
              <Moon className="size-3.5 mr-2 text-muted-foreground" />
            )}
            Toggle theme
          </CommandItem>
          <CommandItem onSelect={signOut} className="text-destructive data-selected:text-destructive">
            <LogOut className="size-3.5 mr-2" />
            Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return { open, setOpen, toggle };
}
