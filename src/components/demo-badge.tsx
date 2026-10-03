import { isDemoMode } from "@/lib/runtime-config";
import { cn } from "@/lib/utils";

/**
 * Marker that the data on screen is local fixture data.
 * Renders nothing once real API configuration is present.
 */
export function DemoBadge({ className }: { className?: string }) {
  if (!isDemoMode()) return null;

  return (
    <span
      title="Local demo data — set VITE_API_URL to use live data."
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[0.6875rem] tracking-wide text-muted-foreground",
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
      Demo workspace
    </span>
  );
}
