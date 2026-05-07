import { useNavigate, useLocation } from "react-router-dom";
import { Home, QrCode, ArrowUpDown, Users, Settings, Store } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const baseNavItems = [
  { label: "Home", icon: Home, path: "/dashboard" },
  { label: "Pay", icon: QrCode, path: "/qr-pay" },
  { label: "Transfer", icon: ArrowUpDown, path: "/transfer" },
  { label: "Referral", icon: Users, path: "/referral" },
  { label: "Settings", icon: Settings, path: "/profile" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isBranchOwner, setIsBranchOwner] = useState(false);

  useEffect(() => {
    setIsBranchOwner(false);
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "branch")
      .then(({ data }) => setIsBranchOwner((data?.length ?? 0) > 0));
  }, [user?.id]);

  let navItems = [...baseNavItems];
  if (isBranchOwner) navItems = [...navItems, { label: "Branch", icon: Store, path: "/branch" }];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-primary/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                isActive ? "text-secondary" : "text-foreground/40 hover:text-foreground/60"
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
