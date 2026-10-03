import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_editor")({
  ssr: false,
  component: EditorLayout,
});

/** Full-screen layout for the editor — no standard nav or max-width constraint. */
function EditorLayout() {
  const { status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "unauthenticated") {
      navigate({ to: "/login", replace: true });
    }
  }, [status, navigate]);

  if (status !== "authenticated") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground font-[family-name:var(--font-body)]">
      <Outlet />
    </div>
  );
}
