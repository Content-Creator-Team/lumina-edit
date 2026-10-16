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
      className={`mx-auto flex items-center justify-center overflow-hidden rounded-xl shadow-lg ring-1 ring-black/10 ${className}`}
      style={{
        background: "linear-gradient(140deg, #ffffff 0%, #f2efff 55%, #e7e3ff 100%)",
      }}
    >
      <img src={iconUrl} alt="" className="size-[62%] object-contain" draggable={false} />
    </span>
  );
}
