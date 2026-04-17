import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Store, Banknote, Settings2, Users, ArrowLeftRight,
  Code, ShieldCheck, GitBranch, LogOut, Activity,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import NocapLogo from "@/components/NocapLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const navItems = [
  { title: "Dashboard", url: "/admin-portal", icon: LayoutDashboard },
  { title: "Merchants", url: "/admin-portal/merchants", icon: Store },
  { title: "Withdrawals", url: "/admin-portal/withdrawals", icon: Banknote },
  { title: "Fee Settings", url: "/admin-portal/fees", icon: Settings2 },
  { title: "Users", url: "/admin-portal/users", icon: Users },
  { title: "Transactions", url: "/admin-portal/transactions", icon: ArrowLeftRight },
  { title: "API Apps", url: "/admin-portal/api-apps", icon: Code },
  { title: "Audit", url: "/admin-portal/audit", icon: ShieldCheck },
  { title: "Distribution Audit", url: "/admin-portal/distribution-audit", icon: Activity },
  { title: "Referral Tree", url: "/admin-portal/referral-tree", icon: GitBranch },
];

const AdminSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out" });
    navigate("/admin-login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="bg-sidebar-background">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-6">
            <div className="flex items-center gap-2">
              <NocapLogo size="sm" />
              {!collapsed && <span className="text-secondary font-bold text-sm">Admin</span>}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.url ||
                  (item.url !== "/admin-portal" && location.pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/admin-portal"}
                        className="hover:bg-sidebar-accent/50 transition-colors"
                        activeClassName="bg-sidebar-accent text-secondary font-medium"
                      >
                        <item.icon className="h-4 w-4 mr-2 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:bg-destructive/10">
                <LogOut className="h-4 w-4 mr-2 shrink-0" />
                {!collapsed && <span>Sign Out</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default AdminSidebar;
