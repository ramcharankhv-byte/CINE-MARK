import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-[32px] border border-white/5 bg-white/[0.02] backdrop-blur-3xl p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-2xl relative overflow-hidden group">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
      
      <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/5 border border-white/10 mb-8 shadow-[0_0_40px_rgba(255,255,255,0.05)] group-hover:shadow-[0_0_60px_rgba(255,255,255,0.1)] transition-all duration-700 group-hover:scale-110">
        <Icon className="h-10 w-10 text-white/50 group-hover:text-white transition-colors duration-500" strokeWidth={1.5} />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-white mb-3 relative">{title}</h2>
      <p className="max-w-md text-center text-base text-white/50 font-light leading-relaxed mb-8 relative">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
