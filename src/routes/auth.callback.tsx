import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy callback path — redirect to login.
export const Route = createFileRoute("/auth/callback")({
  beforeLoad: () => {
    throw redirect({ to: "/login", replace: true });
  },
  component: () => null,
});
