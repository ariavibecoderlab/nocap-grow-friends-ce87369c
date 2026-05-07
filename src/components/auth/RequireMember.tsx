import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { isNativeApp } from "@/lib/platform";

const Spinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-secondary" />
  </div>
);

const STAFF_ONLY = new Set(["admin", "support"]);

const NativeStaffBlock = () => (
  <div className="min-h-screen bg-primary flex items-center justify-center p-6 text-center">
    <div className="max-w-sm">
      <h1 className="font-display text-2xl font-bold text-white mb-2">Use the web app</h1>
      <p className="text-sm text-white/60">
        Staff accounts must sign in at <span className="text-secondary">nocap.life</span> on a browser.
        The mobile app is for members only.
      </p>
    </div>
  </div>
);

const RequireMember = () => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const { roles, loading: rolesLoading } = useUserRoles();

  if (authLoading || rolesLoading) return <Spinner />;
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;

  const hasNonStaffRole = roles.some((r) => !STAFF_ONLY.has(r));
  const isStaffOnly = roles.length > 0 && !hasNonStaffRole;

  if (isStaffOnly) {
    if (isNativeApp()) return <NativeStaffBlock />;
    if (roles.includes("admin")) return <Navigate to="/admin-portal" replace />;
    if (roles.includes("support")) return <Navigate to="/support-portal" replace />;
  }

  return <Outlet />;
};

export default RequireMember;
