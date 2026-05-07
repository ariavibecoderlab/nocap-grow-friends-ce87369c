import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import RequireAuth from "@/components/auth/RequireAuth";
import RequireMember from "@/components/auth/RequireMember";
import MobileBlocked from "@/components/mobile/MobileBlocked";
import DeepLinkHandler from "@/components/mobile/DeepLinkHandler";
import PushRegistration from "@/components/mobile/PushRegistration";
import NativeBootstrap from "@/components/mobile/NativeBootstrap";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { CurrencyProvider } from "@/components/marketplace/CurrencySelector";
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
import AdminLogin from "./pages/AdminLogin";
import AdminPortal from "./pages/AdminPortal";

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
import Authorize from "./pages/Authorize";
import NotFound from "./pages/NotFound";
import SessionManager from "./components/SessionManager";
import UserManual from "./pages/UserManual";
import SellerManual from "./pages/SellerManual";
import UatScripts from "./pages/UatScripts";
import Marketplace from "./pages/Marketplace";
import StorePage from "./pages/StorePage";
import StoreCustomPage from "./pages/StoreCustomPage";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import MyOrders from "./pages/MyOrders";
import Withdraw from "./pages/Withdraw";
import SupportTickets from "./pages/SupportTickets";
import SupportTicketDetail from "./pages/SupportTicketDetail";
import SupportLogin from "./pages/SupportLogin";
import SupportPortal from "./pages/SupportPortal";
import ResetPassword from "./pages/ResetPassword";
import AiHelpChat from "./components/AiHelpChat";
import SellerPortal from "./pages/SellerPortal";
import MerchantStorefrontBuilder from "./pages/MerchantStorefrontBuilder";
import MerchantStorefrontHub from "./pages/MerchantStorefrontHub";
import HostedPay from "./pages/HostedPay";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
        <CurrencyProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SessionManager />
            <NativeBootstrap />
            <DeepLinkHandler />
            <PushRegistration />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/set-password" element={<SetPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/about" element={<About />} />
              <Route path="/terms" element={<TermsConditions />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/user-manual" element={<UserManual />} />
              <Route path="/seller-manual" element={<SellerManual />} />
              <Route path="/api-docs" element={<MobileBlocked><ApiDocs /></MobileBlocked>} />
              <Route path="/authorize" element={<MobileBlocked><Authorize /></MobileBlocked>} />
              <Route path="/admin-login" element={<MobileBlocked><AdminLogin /></MobileBlocked>} />
              <Route path="/support-login" element={<MobileBlocked><SupportLogin /></MobileBlocked>} />
              <Route path="/pay/:linkId" element={<HostedPay />} />
              <Route path="/marketplace" element={<MobileBlocked><Marketplace /></MobileBlocked>} />
              <Route path="/store/:slug" element={<MobileBlocked><StorePage /></MobileBlocked>} />
              <Route path="/store/:slug/page/:pageSlug" element={<MobileBlocked><StoreCustomPage /></MobileBlocked>} />
              <Route path="/store/:slug/product/:productId" element={<MobileBlocked><ProductDetail /></MobileBlocked>} />

              {/* Authenticated (any role) */}
              <Route element={<RequireAuth />}>
                <Route path="/set-pin" element={<SetPin />} />
                <Route path="/reset-pin" element={<ResetPin />} />
                <Route path="/my-profile" element={<MyProfile />} />
              </Route>

              {/* Member-only (blocks staff-only accounts) */}
              <Route element={<RequireMember />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/top-up" element={<TopUp />} />
                <Route path="/transfer" element={<Transfer />} />
                <Route path="/referral" element={<Referral />} />
                <Route path="/qr-pay" element={<QrPay />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/help-support" element={<HelpSupport />} />
                <Route path="/support-tickets" element={<SupportTickets />} />
                <Route path="/support-tickets/:ticketId" element={<SupportTicketDetail />} />
                <Route path="/checkout" element={<MobileBlocked><Checkout /></MobileBlocked>} />
                <Route path="/order/:orderId" element={<MobileBlocked><OrderConfirmation /></MobileBlocked>} />
                <Route path="/my-orders" element={<MobileBlocked><MyOrders /></MobileBlocked>} />
                <Route path="/withdraw" element={<Withdraw />} />
                <Route path="/merchant" element={<MobileBlocked><MerchantDashboard /></MobileBlocked>} />
                <Route path="/merchant/register" element={<MobileBlocked><MerchantRegister /></MobileBlocked>} />
                <Route path="/branch" element={<MobileBlocked><BranchDashboard /></MobileBlocked>} />
                <Route path="/seller-portal" element={<MobileBlocked><SellerPortal /></MobileBlocked>} />
                <Route path="/merchant/storefront" element={<MobileBlocked><MerchantStorefrontHub /></MobileBlocked>} />
                <Route path="/merchant/storefront/:storeId" element={<MobileBlocked><MerchantStorefrontHub /></MobileBlocked>} />
                <Route path="/merchant/storefront/builder" element={<MobileBlocked><MerchantStorefrontBuilder /></MobileBlocked>} />
                <Route path="/merchant/storefront/builder/:storeId" element={<MobileBlocked><MerchantStorefrontBuilder /></MobileBlocked>} />
              </Route>

              {/* Staff (self-guarded internally) */}
              <Route path="/admin-portal" element={<MobileBlocked><AdminPortal /></MobileBlocked>} />
              <Route path="/admin-portal/*" element={<MobileBlocked><AdminPortal /></MobileBlocked>} />
              <Route path="/support-portal" element={<MobileBlocked><SupportPortal /></MobileBlocked>} />
              <Route path="/support-portal/*" element={<MobileBlocked><SupportPortal /></MobileBlocked>} />
              <Route path="/uat-scripts" element={<MobileBlocked><UatScripts /></MobileBlocked>} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <AiHelpChat />
          </BrowserRouter>
        </TooltipProvider>
        </CurrencyProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
