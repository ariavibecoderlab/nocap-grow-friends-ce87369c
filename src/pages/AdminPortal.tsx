import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminDashboard from "@/components/admin/AdminDashboard";
import MerchantApprovals from "@/components/admin/MerchantApprovals";
import FeeSettings from "@/components/admin/FeeSettings";
import UserManagement from "@/components/admin/UserManagement";
import TransactionsList from "@/components/admin/TransactionsList";
import WithdrawalApprovals from "@/components/admin/WithdrawalApprovals";
import ApiAppsManagement from "@/components/admin/ApiAppsManagement";
import WalletReconciliation from "@/components/admin/WalletReconciliation";
import AdminReferralTreeContent from "@/components/admin/AdminReferralTreeContent";
import DistributionAudit from "@/components/admin/DistributionAudit";
import { Loader2 } from "lucide-react";

const sectionMap: Record<string, React.FC> = {
  "": AdminDashboard,
  merchants: MerchantApprovals,
  withdrawals: WithdrawalApprovals,
  fees: FeeSettings,
  users: UserManagement,
  transactions: TransactionsList,
  "api-apps": ApiAppsManagement,
  audit: WalletReconciliation,
  "referral-tree": AdminReferralTreeContent,
  "distribution-audit": DistributionAudit,
};

const AdminPortal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  useEffect(() => {
    if (!authLoading && !user) navigate("/admin-login");
    if (!authLoading && !adminLoading && user && !isAdmin) navigate("/admin-login");
  }, [authLoading, adminLoading, user, isAdmin, navigate]);

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  // Determine which section to render
  const path = location.pathname.replace("/admin-portal", "").replace(/^\//, "");
  const SectionComponent = sectionMap[path] || AdminDashboard;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
            <SidebarTrigger className="mr-4" />
            <span className="text-sm font-medium text-muted-foreground capitalize">
              {path || "dashboard"}
            </span>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
            <SectionComponent />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminPortal;
