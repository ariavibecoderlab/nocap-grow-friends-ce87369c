import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNav from "@/components/BottomNav";
import MerchantApprovals from "@/components/admin/MerchantApprovals";
import FeeSettings from "@/components/admin/FeeSettings";
import UserManagement from "@/components/admin/UserManagement";
import TransactionsList from "@/components/admin/TransactionsList";
import WithdrawalApprovals from "@/components/admin/WithdrawalApprovals";
import { Shield } from "lucide-react";

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
    if (!authLoading && !adminLoading && !isAdmin) navigate("/dashboard");
  }, [authLoading, adminLoading, isAdmin, user, navigate]);

  if (authLoading || adminLoading) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading...</div>;
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-foreground px-4 pt-12 pb-6">
        <div className="mx-auto max-w-md flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-primary-foreground" style={{ color: "hsl(var(--primary))" }}>
            Admin Panel
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 -mt-3">
        <Tabs defaultValue="merchants" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="merchants" className="text-xs">Merchants</TabsTrigger>
            <TabsTrigger value="withdrawals" className="text-xs">Withdraw</TabsTrigger>
            <TabsTrigger value="fees" className="text-xs">Fees</TabsTrigger>
            <TabsTrigger value="users" className="text-xs">Users</TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs">Txns</TabsTrigger>
          </TabsList>
          <TabsContent value="merchants"><MerchantApprovals /></TabsContent>
          <TabsContent value="withdrawals"><WithdrawalApprovals /></TabsContent>
          <TabsContent value="fees"><FeeSettings /></TabsContent>
          <TabsContent value="users"><UserManagement /></TabsContent>
          <TabsContent value="transactions"><TransactionsList /></TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default Admin;
