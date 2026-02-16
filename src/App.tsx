import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import TopUp from "./pages/TopUp";
import Transfer from "./pages/Transfer";
import Referral from "./pages/Referral";
import QrPay from "./pages/QrPay";
import MerchantDashboard from "./pages/MerchantDashboard";
import MerchantRegister from "./pages/MerchantRegister";
import BranchDashboard from "./pages/BranchDashboard";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import MemberOnlyRoute from "./components/MemberOnlyRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/top-up" element={<MemberOnlyRoute><TopUp /></MemberOnlyRoute>} />
            <Route path="/transfer" element={<MemberOnlyRoute><Transfer /></MemberOnlyRoute>} />
            <Route path="/referral" element={<Referral />} />
            <Route path="/qr-pay" element={<MemberOnlyRoute><QrPay /></MemberOnlyRoute>} />
            <Route path="/merchant" element={<MerchantDashboard />} />
            <Route path="/merchant/register" element={<MerchantRegister />} />
            <Route path="/branch" element={<BranchDashboard />} />
            <Route path="/admin" element={<Admin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
