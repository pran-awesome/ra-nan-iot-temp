"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BookOpen, ChartLine, Cpu, LayoutDashboard, LogOut, Menu, Settings2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/components/ui";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { initials } from "@/lib/format";
import type { SessionUser } from "@/lib/types";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/history", label: "Sensor history", icon: ChartLine },
  { href: "/devices", label: "Devices", icon: Cpu },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings2 },
  { href: "/setup", label: "Setup guide", icon: BookOpen },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary">
        <img src="/logo.png" alt="Smart Sop Puen" className="h-full w-full object-cover" />
      </span>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[14px] font-bold tracking-tight text-foreground">Smart Sop Puen</div>
        <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Smart farm</div>
      </div>
    </div>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors",
              active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className={cn("h-[17px] w-[17px] shrink-0", active ? "text-primary" : "text-muted-foreground")} strokeWidth={1.8} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Account({ user }: { user: SessionUser }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-2.5 py-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[11.5px] font-bold text-secondary-foreground">
        {initials(user.name, user.email)}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-[12.5px] font-semibold text-foreground">{user.name || "Signed in"}</div>
        <div className="truncate text-[11px] text-muted-foreground">{user.email}</div>
      </div>
      <button
        type="button"
        aria-label="Sign out"
        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onClick={async () => {
          await createBrowserSupabase().auth.signOut();
          router.push("/login");
          router.refresh();
        }}
      >
        <LogOut className="h-4 w-4" strokeWidth={1.8} />
      </button>
    </div>
  );
}

export function Shell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col justify-between border-r border-border bg-card px-4 py-5 lg:flex">
        <div>
          <div className="px-1">
            <Brand />
          </div>
          <div className="mt-7">
            <NavLinks pathname={pathname} />
          </div>
        </div>
        <div className="space-y-3">
          <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
            Monitoring only — irrigation equipment is never switched automatically.
          </p>
          <Account user={user} />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <button type="button" aria-label="Open menu" className="rounded-xl border border-border p-2 text-foreground" onClick={() => setOpen(true)}>
          <Menu className="h-4 w-4" />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/25" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[268px] flex-col justify-between border-r border-border bg-card px-4 py-5 shadow-2xl">
            <div>
              <div className="flex items-center justify-between">
                <Brand />
                <button type="button" aria-label="Close menu" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-7">
                <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
              </div>
            </div>
            <Account user={user} />
          </div>
        </div>
      ) : null}

      <main className="lg:pl-[248px]">
        <div className="mx-auto w-full max-w-[1100px] px-4 py-6 md:px-8 md:py-9">{children}</div>
      </main>
    </div>
  );
}
