import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";

const Spinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-secondary" />
  </div>
);

const STAFF_ONLY = new Set(["admin", "support"]);

const RequireMember = () => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const { roles, loading: rolesLoading } = useUserRoles();

  if (authLoading || rolesLoading) return <Spinner />;
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;

  // Block users whose ONLY roles are staff roles (admin/support).
  // Allow if there are no roles, or any non-staff role exists.
  const hasNonStaffRole = roles.some((r) => !STAFF_ONLY.has(r));
  const isStaffOnly = roles.length > 0 && !hasNonStaffRole;

  if (isStaffOnly) {
    if (roles.includes("admin")) return <Navigate to="/admin-portal" replace />;
    if (roles.includes("support")) return <Navigate to="/support-portal" replace />;
  }

  return <Outlet />;
};

export default RequireMember;
