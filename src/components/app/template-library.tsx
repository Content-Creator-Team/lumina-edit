import { useQuery } from "@tanstack/react-query";
import { Check, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import type { CreativeTemplate } from "@/lib/api-types";
import { templatesQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (templateId: string, template: CreativeTemplate | null) => void;
  className?: string;
  /** Max height of the scrollable grid. */
  gridClassName?: string;
};

/** Searchable template library with category chips and an "Auto Edit" card. */
export function TemplateLibrary({ value, onChange, className, gridClassName }: Props) {
  const { data, isLoading, isError } = useQuery(templatesQuery());
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  const templates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.templates ?? []).filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (!q) return true;
      return [t.name, t.description, ...(t.platforms ?? [])].join(" ").toLowerCase().includes(q);
    });
  }, [data, query, category]);

  const categories = Object.entries(data?.categories ?? {});
  const auto = data?.auto ?? {
    id: "auto",
    name: "Auto Edit",
    description: "Let the AI pick the best style for your footage.",
  };
  const showAuto = category === "all" && (!query || /auto/i.test(query));

  return (
    <div className={className}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates"
            aria-label="Search templates"
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Template categories">
          {[["all", "All"] as const, ...categories].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={category === id}
              onClick={() => setCategory(id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                category === id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isError && (
        <p className="mt-3 text-xs text-muted-foreground">
          Couldn't load the template library — Auto Edit will be used.
        </p>
      )}

      <div
        className={cn(
          "mt-3 grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2",
          gridClassName,
        )}
      >
        {showAuto && (
          <TemplateCard
            selected={value === "auto"}
            onSelect={() => onChange("auto", null)}
            title={auto.name}
            description={auto.description}
            palette={["var(--primary)", "var(--primary-deep)"]}
            icon
          />
        )}
        {isLoading &&
          Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-border bg-muted/40"
            />
          ))}
        {templates.map((t) => (
          <TemplateCard
            key={t.id}
            selected={value === t.id}
            onSelect={() => onChange(t.id, t)}
            title={t.name}
            description={t.description}
            palette={t.preview_palette}
            meta={[
              data?.categories[t.category] ?? t.category,
              t.default_aspect,
              t.target_duration ? `~${t.target_duration}s` : null,
            ]}
          />
        ))}
        {!isLoading && templates.length === 0 && !showAuto && (
          <p className="col-span-full py-6 text-center text-xs text-muted-foreground">
            No templates match.
          </p>
        )}
      </div>
    </div>
  );
}

function TemplateCard({
  selected,
  onSelect,
  title,
  description,
  palette,
  meta,
  icon,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  palette?: string[] | undefined;
  meta?: Array<string | null | undefined>;
  icon?: boolean;
}) {
  const [c1 = "#64748b", c2 = c1] = palette ?? [];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group relative flex gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        selected ? "border-primary bg-accent/40" : "border-border hover:border-foreground/30",
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-md"
        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
      >
        {icon && <Sparkles className="size-5 text-white" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
          {description}
        </span>
        {meta && (
          <span className="mt-1 block text-[11px] text-muted-foreground/80">
            {meta.filter(Boolean).join(" · ")}
          </span>
        )}
      </span>
      {selected && (
        <Check className="absolute top-2 right-2 size-4 text-primary" aria-hidden="true" />
      )}
    </button>
  );
}
