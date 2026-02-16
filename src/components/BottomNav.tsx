import { useNavigate, useLocation } from "react-router-dom";
import { Home, QrCode, ArrowUpDown, Users, User, Shield, Store } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const baseNavItems = [
  { label: "Home", icon: Home, path: "/dashboard" },
  { label: "QR Pay", icon: QrCode, path: "/qr-pay" },
  { label: "Transfer", icon: ArrowUpDown, path: "/transfer" },
  { label: "Referral", icon: Users, path: "/referral" },
  { label: "Profile", icon: User, path: "/profile" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAdminCheck();
  const { user } = useAuth();
  const [isBranchOwner, setIsBranchOwner] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "branch")
      .then(({ data }) => setIsBranchOwner((data?.length ?? 0) > 0));
  }, [user]);

  let navItems = [...baseNavItems];
  if (isBranchOwner) navItems = [...navItems, { label: "Branch", icon: Store, path: "/branch" }];
  if (isAdmin) navItems = [...navItems, { label: "Admin", icon: Shield, path: "/admin" }];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                isActive ? "text-secondary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
