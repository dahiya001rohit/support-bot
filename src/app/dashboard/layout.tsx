"use client";

import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { CommandPalette, useCommandPalette } from "@/components/dashboard/command-palette";
import { Toaster } from "@/components/ui/sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { open, setOpen, toggle } = useCommandPalette();

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav onOpenPalette={toggle} />
      <main className="lg:pl-52 pt-12 lg:pt-0">
        <div className="p-5 max-w-5xl mx-auto">{children}</div>
      </main>
      <Toaster position="top-right" />
      <CommandPalette open={open} onOpenChange={setOpen} />
    </div>
  );
}
