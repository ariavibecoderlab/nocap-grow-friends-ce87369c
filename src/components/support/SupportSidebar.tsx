import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Ticket, LogOut, Headphones } from "lucide-react";
import NocapLogo from "@/components/NocapLogo";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { label: "Dashboard", path: "/support-portal", icon: LayoutDashboard },
  { label: "Tickets", path: "/support-portal/tickets", icon: Ticket },
];

export default function SupportSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/support-login");
  };

  return (
    <div className="w-64 bg-card border-r border-border min-h-screen flex flex-col p-4">
      <div className="flex items-center gap-2 mb-8">
        <NocapLogo size="sm" />
        <div>
          <span className="font-display text-sm font-bold text-foreground">NoCap</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Headphones className="h-3 w-3" /> Support Portal
          </div>
        </div>
      </div>

      <nav className="space-y-1 flex-1">
        {navItems.map(item => {
          const active = location.pathname === item.path || (item.path === "/support-portal/tickets" && location.pathname.startsWith("/support-portal/tickets"));
          return (
            <Button key={item.path} variant={active ? "secondary" : "ghost"} className="w-full justify-start gap-2"
              onClick={() => navigate(item.path)}>
              <item.icon className="h-4 w-4" /> {item.label}
            </Button>
          );
        })}
      </nav>

      <Button variant="ghost" className="w-full justify-start gap-2 text-destructive" onClick={handleLogout}>
        <LogOut className="h-4 w-4" /> Sign Out
      </Button>
    </div>
  );
}
