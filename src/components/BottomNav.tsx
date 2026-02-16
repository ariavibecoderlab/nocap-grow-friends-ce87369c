import { useNavigate, useLocation } from "react-router-dom";
import { Home, QrCode, ArrowUpDown, Users, User, Shield } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";

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

  const navItems = isAdmin
    ? [...baseNavItems, { label: "Admin", icon: Shield, path: "/admin" }]
    : baseNavItems;

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
