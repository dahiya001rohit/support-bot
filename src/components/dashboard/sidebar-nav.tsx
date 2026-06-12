"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  BookOpen,
  Ticket,
  MessageSquare,
  BarChart2,
  Settings,
  Code2,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Search,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/dashboard/tickets", label: "Tickets", icon: Ticket },
  { href: "/dashboard/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/widget", label: "Get Widget Code", icon: Code2 },
];

interface SidebarNavProps {
  onOpenPalette: () => void;
}

export function SidebarNav({ onOpenPalette }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const navContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border">
        <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center shrink-0">
          <MessageSquare className="size-3.5 text-primary-foreground" />
        </div>
        <span className="text-[13px] font-semibold text-sidebar-foreground tracking-tight">
          SupportAI
        </span>
      </div>

      {/* Search / cmd+K hint */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={() => { setMobileOpen(false); onOpenPalette(); }}
          className="flex w-full items-center gap-2 rounded-md border border-sidebar-border bg-transparent px-2.5 py-1.5 text-[12px] text-muted-foreground hover:bg-accent transition-colors"
        >
          <Search className="size-3 shrink-0" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-sidebar-border px-1 py-px text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-px overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-3 pt-2 border-t border-sidebar-border space-y-px">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          {mounted && theme === "dark" ? (
            <Sun className="size-3.5 shrink-0" />
          ) : (
            <Moon className="size-3.5 shrink-0" />
          )}
          {mounted && theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40"
        >
          <LogOut className="size-3.5 shrink-0" />
          {loggingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-52 shrink-0 flex-col bg-sidebar border-r border-sidebar-border fixed inset-y-0 left-0 z-40">
        {navContent}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-sidebar px-4 py-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-md bg-primary flex items-center justify-center">
            <MessageSquare className="size-3 text-primary-foreground" />
          </div>
          <span className="text-[13px] font-semibold text-sidebar-foreground">SupportAI</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-muted-foreground hover:text-foreground p-1"
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-50 w-52 bg-sidebar border-r border-sidebar-border">
            {navContent}
          </aside>
        </>
      )}
    </>
  );
}
