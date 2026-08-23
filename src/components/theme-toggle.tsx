import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Light/dark switch. Icons are rendered with the `dark:` variant rather than
 * from React state, so the button is correct on first paint (no flash, no
 * hydration mismatch) and stays keyboard operable as a plain button.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch between light and dark theme"
      title="Switch theme"
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      <Sun className="size-4 dark:hidden" aria-hidden="true" strokeWidth={1.75} />
      <Moon className="hidden size-4 dark:block" aria-hidden="true" strokeWidth={1.75} />
    </button>
  );
}
