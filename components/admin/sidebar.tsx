"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  FileText,
  CreditCard,
  Search,
  Layers,
  Users,
  MessageSquare,
  Activity,
  ExternalLink,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { logoutAction } from "@/app/admin/actions";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const adminNavItems: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/clinics", label: "Clinics", icon: Building2 },
  { href: "/admin/articles", label: "Articles", icon: FileText },
  { href: "/admin/pricing", label: "Pricing", icon: CreditCard },
  { href: "/admin/seo", label: "Page SEO", icon: Search },
  { href: "/admin/blocks", label: "Content Blocks", icon: Layers },
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/kapso", label: "WhatsApp", icon: MessageSquare },
  { href: "/admin/jobs", label: "Jobs", icon: Activity },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-3 pt-2">
          <Link href="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white font-bold text-lg shadow-sm transition-transform group-hover:scale-105">
              D
            </div>
            <div>
              <span className="text-base font-bold text-primary tracking-tight">Dentora</span>
              <span className="ms-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Admin
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation list */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted">
            Menu Principal
          </p>
          <nav className="space-y-1">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-primary text-white shadow-xs font-semibold"
                      : "text-muted hover:bg-surface-subtle hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      active ? "text-white" : "text-muted group-hover:text-primary"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer controls & Profile */}
      <div className="space-y-3 pt-6 border-t border-border">
        {/* External Site Link */}
        <Link
          href="/fr/blog"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface-subtle hover:text-foreground"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="h-3.5 w-3.5 text-muted" />
            <span>Voir le site public</span>
          </span>
          <span className="text-[10px] text-muted">fr/ar</span>
        </Link>

        {/* User Card */}
        <div className="flex items-center gap-3 rounded-xl bg-surface-subtle/80 p-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">Administrateur</p>
            <p className="text-[11px] text-muted truncate">dentora.ma</p>
          </div>
        </div>

        {/* Sign Out Button */}
        <form action={logoutAction} className="w-full">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted transition-colors hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-64 md:flex-col border-r border-border bg-surface p-4">
        {navContent}
      </aside>

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface px-4 md:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm">
            D
          </div>
          <span className="text-sm font-bold text-primary">Dentora Admin</span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-muted hover:bg-surface-subtle hover:text-foreground"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile Overlay & Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-border bg-surface p-5 shadow-2xl animate-in slide-in-from-left duration-200">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
