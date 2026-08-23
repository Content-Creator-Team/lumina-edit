import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Film,
  Loader2,
  UploadCloud,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Descriptor = { label: string; icon: LucideIcon; className: string };

const MAP: Record<string, Descriptor> = {
  uploading: {
    label: "Uploading",
    icon: UploadCloud,
    className: "border-border text-muted-foreground",
  },
  processing: { label: "Processing", icon: Loader2, className: "border-border text-foreground" },
  plan_ready: {
    label: "Plan ready",
    icon: ClipboardCheck,
    className: "border-accent-foreground/30 text-accent-foreground",
  },
  approved: { label: "Approved", icon: CheckCircle2, className: "border-border text-foreground" },
  rendering: { label: "Rendering", icon: Film, className: "border-border text-foreground" },
  complete: {
    label: "Complete",
    icon: CheckCircle2,
    className: "border-primary/40 text-primary",
  },
  failed: {
    label: "Failed",
    icon: AlertTriangle,
    className: "border-destructive/50 text-destructive",
  },
  queued: { label: "Queued", icon: Clock, className: "border-border text-muted-foreground" },
};

/**
 * Status is conveyed by icon + text as well as colour, so it never depends on
 * colour alone.
 */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = (status ?? "").toLowerCase();
  const descriptor = MAP[key] ?? {
    label: status || "Unknown",
    icon: Clock,
    className: "border-border text-muted-foreground",
  };
  const Icon = descriptor.icon;
  const spinning = key === "processing" || key === "rendering" || key === "uploading";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tracking-wide",
        descriptor.className,
        className,
      )}
    >
      <Icon className={cn("size-3.5", spinning && "animate-spin")} aria-hidden="true" />
      {descriptor.label}
    </span>
  );
}
