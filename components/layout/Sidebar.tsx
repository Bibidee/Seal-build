"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield, Search, PlusCircle, LayoutDashboard, Briefcase,
  Coins, Activity, Eye, Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/",             label: "Seal",           icon: Shield,         exact: true },
  { href: "/explore",      label: "Explore",         icon: Search          },
  { href: "/create",       label: "Create Seal",     icon: PlusCircle      },
  { href: "/dashboard/buyer",      label: "Buyer",   icon: LayoutDashboard },
  { href: "/dashboard/contributor", label: "Contributor", icon: Briefcase  },
  { href: "/claims",       label: "Claim Center",    icon: Coins           },
  { href: "/activity",     label: "Activity",        icon: Activity        },
  { href: "/admin",        label: "Admin Monitor",   icon: Eye             },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-[#07080C] border-r border-[#1e293b] flex flex-col z-40">
      <div className="px-5 py-6 border-b border-[#1e293b]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#E0B64B]/10 border border-[#E0B64B]/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-[#E0B64B]" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#E0B64B]" style={{ fontFamily: "var(--font-display)" }}>SEAL</span>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-[#334155] mt-1">Delivery Acceptance Protocol</div>
      </div>

      <nav className="flex-1 py-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? path === href : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-5 py-2.5 text-sm transition-all",
                active
                  ? "text-[#E0B64B] bg-[#1a1200]/70 border-r-2 border-[#E0B64B]"
                  : "text-[#475569] hover:text-[#94a3b8] hover:bg-[#0a0f1a]"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-[#1e293b]">
        <div className="text-[9px] uppercase tracking-widest text-[#1e293b] mb-1">GenLayer StudioNet</div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
          <span className="text-[10px] text-[#334155]">Chain 61999</span>
        </div>
      </div>
    </aside>
  );
}
