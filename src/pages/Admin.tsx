import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import MerchantApprovals from "@/components/admin/MerchantApprovals";
import FeeSettings from "@/components/admin/FeeSettings";
import UserManagement from "@/components/admin/UserManagement";
import TransactionsList from "@/components/admin/TransactionsList";
import WithdrawalApprovals from "@/components/admin/WithdrawalApprovals";
import ApiAppsManagement from "@/components/admin/ApiAppsManagement";
import { Shield, ClipboardCheck } from "lucide-react";
import NocapLogo from "@/components/NocapLogo";
import { generateUatPdf } from "@/lib/generateUatPdf";

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
    if (!authLoading && !adminLoading && !isAdmin) navigate("/dashboard");
  }, [authLoading, adminLoading, isAdmin, user, navigate]);

  if (authLoading || adminLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-primary text-white/40">Loading...</div>;
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="px-4 pt-12 pb-6">
        <div className="mx-auto max-w-md flex items-center gap-3">
          <NocapLogo size="sm" />
          <div className="flex items-center gap-2 flex-1">
            <Shield className="h-5 w-5 text-secondary" />
            <h1 className="text-xl font-bold text-secondary">Admin Panel</h1>
          </div>
          <Button variant="outline" size="sm" onClick={generateUatPdf} className="border-white/20 text-white/70 hover:text-white hover:bg-white/10 text-xs">
            <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
            UAT PDF
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        <Tabs defaultValue="merchants" className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-white/5 border border-white/10">
            <TabsTrigger value="merchants" className="text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">Merchants</TabsTrigger>
            <TabsTrigger value="withdrawals" className="text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">Withdraw</TabsTrigger>
            <TabsTrigger value="fees" className="text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">Fees</TabsTrigger>
            <TabsTrigger value="users" className="text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">Users</TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">Txns</TabsTrigger>
            <TabsTrigger value="api-apps" className="text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">API</TabsTrigger>
          </TabsList>
          <TabsContent value="merchants"><MerchantApprovals /></TabsContent>
          <TabsContent value="withdrawals"><WithdrawalApprovals /></TabsContent>
          <TabsContent value="fees"><FeeSettings /></TabsContent>
          <TabsContent value="users"><UserManagement /></TabsContent>
          <TabsContent value="transactions"><TransactionsList /></TabsContent>
          <TabsContent value="api-apps"><ApiAppsManagement /></TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default Admin;
