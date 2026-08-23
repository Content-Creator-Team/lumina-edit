import { AlertTriangle, Loader2, TimerReset } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ApiError, isApiConfigured } from "@/lib/api-client";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title = "Something went wrong",
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  const apiError = error instanceof ApiError ? error : null;
  const rateLimited = apiError?.isRateLimited ?? false;
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";

  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-border p-6"
    >
      <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
        {rateLimited ? (
          <TimerReset className="size-4 text-muted-foreground" aria-hidden="true" />
        ) : (
          <AlertTriangle className="size-4 text-destructive" aria-hidden="true" />
        )}
        {rateLimited ? "Usage limit reached" : title}
      </span>
      <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
      {!isApiConfigured() && (
        <p className="text-xs text-muted-foreground">
          Set <code className="font-mono">VITE_API_URL</code> in your environment (see
          <code className="ml-1 font-mono">.env.example</code>) to connect the app to your FastAPI
          service.
        </p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-20 text-center">
      {icon}
      <h2 className="mt-4 text-base font-medium text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
