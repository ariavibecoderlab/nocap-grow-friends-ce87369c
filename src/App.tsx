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
import Transactions from "./pages/Transactions";
import HelpSupport from "./pages/HelpSupport";
import TermsConditions from "./pages/TermsConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import About from "./pages/About";
import SetPassword from "./pages/SetPassword";
import MyProfile from "./pages/MyProfile";
import SetPin from "./pages/SetPin";
import ResetPin from "./pages/ResetPin";
import Analytics from "./pages/Analytics";
import ApiDocs from "./pages/ApiDocs";
import NotFound from "./pages/NotFound";
import SessionManager from "./components/SessionManager";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SessionManager />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/top-up" element={<TopUp />} />
            <Route path="/transfer" element={<Transfer />} />
            <Route path="/referral" element={<Referral />} />
            <Route path="/qr-pay" element={<QrPay />} />
            <Route path="/merchant" element={<MerchantDashboard />} />
            <Route path="/merchant/register" element={<MerchantRegister />} />
            <Route path="/branch" element={<BranchDashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/api-docs" element={<ApiDocs />} />
            <Route path="/help-support" element={<HelpSupport />} />
            <Route path="/terms" element={<TermsConditions />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/about" element={<About />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/my-profile" element={<MyProfile />} />
            <Route path="/set-pin" element={<SetPin />} />
            <Route path="/reset-pin" element={<ResetPin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
