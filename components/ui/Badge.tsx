import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "gold" | "cyan" | "green" | "red" | "purple" | "slate" | "amber";
}

const variants = {
  gold:   "text-[#E0B64B] bg-[#1a1200]/70 border-[#E0B64B]/30",
  cyan:   "text-[#22D3EE] bg-[#001a1f]/70 border-[#22D3EE]/30",
  green:  "text-[#16A34A] bg-[#001a08]/70 border-[#16A34A]/30",
  red:    "text-[#EF4444] bg-[#1a0000]/70 border-[#EF4444]/30",
  purple: "text-[#7C3AED] bg-[#0d0020]/70 border-[#7C3AED]/30",
  slate:  "text-[#64748B] bg-[#0a0f1a]/70 border-[#64748B]/30",
  amber:  "text-[#F59E0B] bg-[#1a1000]/70 border-[#F59E0B]/30",
};

export function Badge({ children, className, variant = "slate" }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium border uppercase tracking-wider",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}
