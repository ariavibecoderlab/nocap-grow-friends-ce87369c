import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface MemberOnlyRouteProps {
  children: React.ReactNode;
}

const MemberOnlyRoute = ({ children }: MemberOnlyRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const [hasSpecialRole, setHasSpecialRole] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setHasSpecialRole(false);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const roles = data?.map((r) => r.role) ?? [];
        setHasSpecialRole(
          roles.includes("admin") || roles.includes("merchant") || roles.includes("branch")
        );
      });
  }, [user]);

  if (authLoading || hasSpecialRole === null) return null;
  if (hasSpecialRole) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export default MemberOnlyRoute;
