// App icon mark cut from the official REELZOY logo (transparent background).
import iconUrl from "@/assets/app-icon.png";

/**
 * The rounded gradient app tile with the icon mark inside — used on auth
 * screens where only the icon should show, not the full wordmark.
 */
export function AppIconBadge({ className = "size-12" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`mx-auto flex items-center justify-center overflow-hidden rounded-xl shadow-lg ${className}`}
      style={{
        background: "linear-gradient(140deg, var(--primary), var(--primary-deep))",
      }}
    >
      <img src={iconUrl} alt="" className="size-[62%] object-contain" draggable={false} />
    </span>
  );
}
