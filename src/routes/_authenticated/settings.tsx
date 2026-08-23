import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { isKeycloakConfigured, keycloakAccountConsoleUrl } from "@/lib/keycloak-config";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Cutroom" },
      { name: "description", content: "Your profile, organisation, role and workspace links." },
      { property: "og:title", content: "Settings — Cutroom" },
      { property: "og:description", content: "Your profile, organisation, role and workspace links." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

const GRAFANA_URL = import.meta.env["VITE_GRAFANA_URL"] as string | undefined;
const POSTHOG_URL = import.meta.env["VITE_POSTHOG_URL"] as string | undefined;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-3 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

function SettingsPage() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin") || hasRole("owner") || hasRole("org-admin");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your details come from your single sign-on token, so they always match your identity
        provider.
      </p>

      <section className="mt-8" aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="text-sm font-medium text-foreground">
          Profile
        </h2>
        <dl className="mt-3 rounded-lg border border-border px-4">
          <Row label="Name" value={user?.name ?? "Not provided"} />
          <Row label="Email" value={user?.email ?? "Not provided"} />
          <Row label="Organisation" value={user?.org ?? "Not provided in your token"} />
          <Row label="Roles" value={user?.roles.length ? user.roles.join(", ") : "No roles assigned"} />
        </dl>

        {isKeycloakConfigured() && (
          <Button asChild variant="outline" className="mt-4">
            <a href={keycloakAccountConsoleUrl()} target="_blank" rel="noreferrer noopener">
              Manage your account
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </Button>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Passwords, multi-factor devices and recovery are handled entirely by your identity
          provider's account console.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="team-heading">
        <h2 id="team-heading" className="text-sm font-medium text-foreground">
          Team
        </h2>
        <div className="mt-3 flex items-start gap-3 rounded-lg border border-dashed border-border p-5">
          <Users className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-sm text-foreground">
              {isAdmin
                ? "You have an administrator role for your organisation."
                : "You have standard member access for your organisation."}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Team member listings aren't shown here: the API doesn't expose a members endpoint, and
              we won't display invented data. Manage people and role assignments in your identity
              provider.
            </p>
          </div>
        </div>
      </section>

      {(GRAFANA_URL || POSTHOG_URL) && (
        <section className="mt-10" aria-labelledby="observability-heading">
          <h2 id="observability-heading" className="text-sm font-medium text-foreground">
            Observability
          </h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {GRAFANA_URL && (
              <Button asChild variant="outline">
                <a href={GRAFANA_URL} target="_blank" rel="noreferrer noopener">
                  Grafana dashboards
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              </Button>
            )}
            {POSTHOG_URL && (
              <Button asChild variant="outline">
                <a href={POSTHOG_URL} target="_blank" rel="noreferrer noopener">
                  PostHog analytics
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              </Button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
