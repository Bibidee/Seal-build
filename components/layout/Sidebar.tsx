"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Anchor, FolderSearch, FilePlus2, LayoutGrid, Hammer, Vault, Radio, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/",                   label: "Dock",            icon: Anchor,       exact: true },
  { href: "/explore",            label: "Cases",           icon: FolderSearch              },
  { href: "/create",             label: "Open Seal",       icon: FilePlus2                 },
  { href: "/dashboard/buyer",    label: "Buyer Desk",      icon: LayoutGrid                },
  { href: "/dashboard/contributor", label: "Contributor Bay", icon: Hammer               },
  { href: "/claims",             label: "Claim Gate",      icon: Vault                     },
  { href: "/activity",           label: "Activity Log",    icon: Radio                     },
  { href: "/admin",              label: "Admin Monitor",   icon: Gauge                     },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 w-52 bg-[#080B10] border-r border-[#182030] flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-[#182030]">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-6 h-6 border border-[#00C9E8]/40 bg-[#001E28] flex items-center justify-center">
            <Anchor className="w-3.5 h-3.5 text-[#00C9E8]" />
          </div>
          <span
            className="text-xl font-bold tracking-[0.15em] text-[#E8EDF5]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SEAL
          </span>
        </div>
        <div className="manifest-label pl-9">DELIVERY ACCEPTANCE DOCK</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? path === href : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-5 py-2.5 text-sm transition-all relative",
                active
                  ? "text-[#00C9E8] bg-[#001E28] border-r-2 border-[#00C9E8]"
                  : "text-[#5C7090] hover:text-[#A0B4C8] hover:bg-[#0C1118]"
              )}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.04em" }}>
                {label.toUpperCase()}
              </span>
              {active && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#00C9E8]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Network status */}
      <div className="px-5 py-4 border-t border-[#182030]">
        <div className="manifest-label mb-2">NETWORK STATUS</div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00E87A] pulse-cyan" />
          <span className="text-[10px] font-mono text-[#2A3A50]">STUDIONET · 61999</span>
        </div>
      </div>
    </aside>
  );
}
