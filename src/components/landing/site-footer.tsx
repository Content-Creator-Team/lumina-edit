import { Link } from "@tanstack/react-router";
import { BrandMark } from "./site-header";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 sm:grid-cols-4">
        <div>
          <BrandMark />
          <p className="mt-2 text-sm text-muted-foreground">Turn Your Ideas Into Viral Videos</p>
        </div>
        <div>
          <p className="text-sm font-semibold">Product</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/features" className="hover:text-foreground">Features</Link></li>
            <li><Link to="/templates" className="hover:text-foreground">Templates</Link></li>
            <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">App</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
            <li><Link to="/upload" className="hover:text-foreground">Upload</Link></li>
            <li><Link to="/highlights" className="hover:text-foreground">AI Highlights</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Account</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/login" className="hover:text-foreground">Login</Link></li>
            <li><Link to="/register" className="hover:text-foreground">Sign up</Link></li>
            <li><Link to="/forgot-password" className="hover:text-foreground">Reset password</Link></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} REELZOY. All rights reserved.
      </p>
    </footer>
  );
}
