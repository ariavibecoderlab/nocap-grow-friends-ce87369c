import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NocapLogo from "@/components/NocapLogo";
import {
  ChevronDown, ChevronRight, Search, ArrowLeft, BookOpen, FileText,
  CheckCircle, XCircle, AlertTriangle, BarChart3, Download, RotateCcw,
  LogIn, LayoutDashboard, Wallet, QrCode, ArrowUpDown, Users, Shield,
  Bell, Settings, Store, Code, Globe, Smartphone, Key, Lock, Zap, Database
} from "lucide-react";

interface TestCase {
  id: string;
  title: string;
  precondition: string;
  steps: string[];
  expected: string;
  status: "untested" | "pass" | "fail" | "blocked";
  notes: string;
}

interface TestModule {
  id: string;
  title: string;
  icon: any;
  cases: TestCase[];
}

const testModules: TestModule[] = [
  {
    id: "auth", title: "Authentication & Onboarding", icon: LogIn,
    cases: [
      { id: "TC-AUTH-001", title: "New User Sign Up", precondition: "User has no existing account", steps: ["Navigate to /auth", "Click Continue with email", "Enter referral code when prompted", "Click Create Account & Send OTP", "Enter OTP from email", "Click Verify & Continue"], expected: "Account created. OTP verified. User redirected to dashboard.", status: "untested", notes: "" },
      { id: "TC-AUTH-002", title: "Login with OTP", precondition: "User has a verified account", steps: ["Navigate to /auth", "Enter registered email", "Click Continue", "Enter 6-digit OTP from email", "Click Verify & Continue"], expected: "User redirected to /dashboard. Wallet balance displayed.", status: "untested", notes: "" },
      { id: "TC-AUTH-003", title: "Login with Password", precondition: "User has set a password", steps: ["Navigate to /auth", "Enter email, click Continue", "Click 'Sign in with password instead'", "Enter password", "Click Sign In"], expected: "User redirected to /dashboard.", status: "untested", notes: "" },
      { id: "TC-AUTH-004", title: "Invalid OTP", precondition: "OTP sent to user", steps: ["Enter incorrect OTP code", "Click Verify"], expected: "Error toast: 'Invalid OTP'. User remains on OTP screen.", status: "untested", notes: "" },
      { id: "TC-AUTH-005", title: "Logout", precondition: "User is logged in", steps: ["Navigate to Profile", "Click Sign Out"], expected: "User redirected to landing page. Session cleared.", status: "untested", notes: "" },
      { id: "TC-AUTH-006", title: "Onboarding Checklist", precondition: "New user, first login", steps: ["Log in as new user", "Observe dashboard"], expected: "Checklist shows pending items (Set PIN, Complete Profile). Items update as completed.", status: "untested", notes: "" },
    ]
  },
  {
    id: "dashboard", title: "Member Dashboard", icon: LayoutDashboard,
    cases: [
      { id: "TC-DASH-001", title: "View Dashboard", precondition: "User is logged in as member", steps: ["Navigate to /dashboard"], expected: "Dashboard displays: wallet balance, recent transactions, quick action buttons.", status: "untested", notes: "" },
      { id: "TC-DASH-002", title: "Quick Actions Navigation", precondition: "User is on dashboard", steps: ["Click Pay → verify /qr-pay", "Click Top Up → verify /top-up", "Click Transfer → verify /transfer", "Click Referral → verify /referral"], expected: "Each button navigates to the correct page.", status: "untested", notes: "" },
      { id: "TC-DASH-003", title: "Balance Show/Hide Toggle", precondition: "User on dashboard", steps: ["Click the eye icon next to balance"], expected: "Balance toggles between visible (RM X.XX) and hidden (RM ••••••).", status: "untested", notes: "" },
    ]
  },
  {
    id: "topup", title: "Wallet Top-Up", icon: Wallet,
    cases: [
      { id: "TC-TOPUP-001", title: "Initiate Top-Up", precondition: "User is logged in", steps: ["Navigate to /top-up", "Enter amount (e.g., RM 50.00)", "Click Top Up", "Complete payment via gateway"], expected: "Bill created. Wallet balance increases. Transaction in history.", status: "untested", notes: "" },
      { id: "TC-TOPUP-002", title: "Invalid Amount", precondition: "User is logged in", steps: ["Navigate to /top-up", "Enter 0 or negative amount", "Try to submit"], expected: "Validation error. Form does not submit.", status: "untested", notes: "" },
    ]
  },
  {
    id: "qrpay", title: "QR Pay", icon: QrCode,
    cases: [
      { id: "TC-QRPAY-001", title: "Scan and Pay", precondition: "Logged in, sufficient balance, merchant QR available", steps: ["Navigate to /qr-pay", "Scan merchant QR code", "Confirm amount", "Enter PIN if required", "Confirm payment"], expected: "Payment processed. Balance deducted. Cashback credited.", status: "untested", notes: "" },
      { id: "TC-QRPAY-002", title: "Insufficient Balance", precondition: "Balance lower than payment amount", steps: ["Attempt QR payment for amount exceeding balance"], expected: "Error: Insufficient balance. Payment not processed.", status: "untested", notes: "" },
      { id: "TC-QRPAY-003", title: "Expired QR Code", precondition: "QR code has expired", steps: ["Scan expired QR code"], expected: "Error: QR code expired or invalid.", status: "untested", notes: "" },
    ]
  },
  {
    id: "transfer", title: "Peer-to-Peer Transfer", icon: ArrowUpDown,
    cases: [
      { id: "TC-XFER-001", title: "Transfer to Another User", precondition: "Sender logged in with sufficient balance", steps: ["Navigate to /transfer", "Enter recipient phone/email", "Enter amount", "Enter PIN if required", "Confirm"], expected: "Transfer processed. Both see transaction in history.", status: "untested", notes: "" },
      { id: "TC-XFER-002", title: "Non-Existent Recipient", precondition: "Sender is logged in", steps: ["Enter non-existent phone/email", "Attempt transfer"], expected: "Error: User not found.", status: "untested", notes: "" },
      { id: "TC-XFER-003", title: "Transfer to Self", precondition: "User is logged in", steps: ["Enter own phone/email as recipient", "Attempt transfer"], expected: "Error: Cannot transfer to yourself.", status: "untested", notes: "" },
    ]
  },
  {
    id: "transactions", title: "Transaction History", icon: BarChart3,
    cases: [
      { id: "TC-TXN-001", title: "View Transaction List", precondition: "User has prior transactions", steps: ["Navigate to /transactions"], expected: "Transactions listed with date, type, amount, status. Most recent first.", status: "untested", notes: "" },
      { id: "TC-TXN-002", title: "View Transaction Detail", precondition: "Transactions exist", steps: ["Click on a transaction row"], expected: "Detail shows: ID, type, amount, fee, net, description, date, status.", status: "untested", notes: "" },
    ]
  },
  {
    id: "pin", title: "PIN Management", icon: Lock,
    cases: [
      { id: "TC-PIN-001", title: "Set New PIN", precondition: "User has no PIN set", steps: ["Navigate to /set-pin", "Enter 7-digit PIN", "Confirm PIN", "Submit"], expected: "PIN set successfully. Toast confirmation.", status: "untested", notes: "" },
      { id: "TC-PIN-002", title: "Reset PIN via OTP", precondition: "User has PIN set and email on file", steps: ["Navigate to /reset-pin", "Request OTP", "Enter OTP from email", "Set new PIN"], expected: "OTP verified. New PIN set.", status: "untested", notes: "" },
      { id: "TC-PIN-003", title: "PIN Lock After Failed Attempts", precondition: "User has a PIN set", steps: ["Attempt payment", "Enter wrong PIN 3 times"], expected: "Account locked for PIN entry. Lockout duration shown.", status: "untested", notes: "" },
    ]
  },
  {
    id: "referral", title: "Referral System", icon: Users,
    cases: [
      { id: "TC-REF-001", title: "View Referral Code", precondition: "User is logged in", steps: ["Navigate to /referral"], expected: "Unique code displayed. Share options visible. Tier info shown.", status: "untested", notes: "" },
      { id: "TC-REF-002", title: "Sign Up with Referral Code", precondition: "Valid referral code", steps: ["New user signs up", "Enter referral code during registration"], expected: "Referral recorded. Referral tree updated.", status: "untested", notes: "" },
    ]
  },
  {
    id: "merchant-reg", title: "Merchant Registration", icon: Store,
    cases: [
      { id: "TC-MREG-001", title: "Submit Application", precondition: "User is logged in as member", steps: ["Navigate to /merchant/register", "Fill business details", "Enter bank details", "Submit"], expected: "Application submitted as pending. Confirmation shown.", status: "untested", notes: "" },
      { id: "TC-MREG-002", title: "Incomplete Application", precondition: "On registration page", steps: ["Leave required fields empty", "Click submit"], expected: "Validation errors shown. Form does not submit.", status: "untested", notes: "" },
    ]
  },
  {
    id: "merchant-dash", title: "Merchant Dashboard", icon: Store,
    cases: [
      { id: "TC-MDASH-001", title: "View Dashboard", precondition: "User has merchant role", steps: ["Navigate to /merchant"], expected: "Shows revenue, transactions, branch performance, analytics.", status: "untested", notes: "" },
      { id: "TC-MDASH-002", title: "Request Withdrawal", precondition: "Available balance above minimum", steps: ["Go to Withdrawals tab", "Select branch", "Enter amount", "Submit"], expected: "Withdrawal request created as pending.", status: "untested", notes: "" },
    ]
  },
  {
    id: "api-apps", title: "API Apps", icon: Code,
    cases: [
      { id: "TC-MAPI-001", title: "Register New API App", precondition: "User is a merchant", steps: ["Go to API Apps tab", "Click Register App", "Enter name, description, branch", "Submit"], expected: "App created. API key and secret shown ONCE.", status: "untested", notes: "" },
      { id: "TC-MAPI-002", title: "Toggle Sandbox Mode", precondition: "API app exists", steps: ["Toggle Sandbox switch"], expected: "Sandbox mode toggled. Badge updates.", status: "untested", notes: "" },
    ]
  },
  {
    id: "admin", title: "Admin Panel", icon: Settings,
    cases: [
      { id: "TC-ADMIN-001", title: "View All Users", precondition: "Logged in as admin", steps: ["Navigate to /admin → Users tab"], expected: "List of all users with roles and status.", status: "untested", notes: "" },
      { id: "TC-ADMIN-002", title: "Approve Merchant", precondition: "Pending application exists", steps: ["Go to Merchant Approvals", "Review application", "Click Approve"], expected: "Status → approved. User gains merchant role. Branch created.", status: "untested", notes: "" },
      { id: "TC-ADMIN-003", title: "Update Fee Settings", precondition: "Admin on Fee Settings", steps: ["Change a fee value", "Save"], expected: "Setting saved. Applied to future transactions.", status: "untested", notes: "" },
      { id: "TC-ADMIN-004", title: "Approve Withdrawal", precondition: "Pending withdrawal exists", steps: ["Go to Withdrawal Approvals", "Review", "Click Approve"], expected: "Withdrawal approved. Balance deducted. Transaction recorded.", status: "untested", notes: "" },
    ]
  },
  {
    id: "session", title: "Session & Security", icon: Shield,
    cases: [
      { id: "TC-SESSION-001", title: "Inactivity Timeout Warning", precondition: "User is logged in", steps: ["Remain idle for 8 minutes"], expected: "Warning dialog with 2-min countdown. Stay/Logout options.", status: "untested", notes: "" },
      { id: "TC-SESSION-002", title: "Auto-Logout", precondition: "Warning dialog showing", steps: ["Wait for countdown to reach zero"], expected: "Auto logged out. Redirected to landing page.", status: "untested", notes: "" },
      { id: "TC-SESSION-003", title: "Double-Click Prevention", precondition: "On payment confirmation", steps: ["Rapidly double-click Confirm"], expected: "Only one transaction created. Button disabled after first click.", status: "untested", notes: "" },
    ]
  },
  {
    id: "api-integration", title: "API Integration", icon: Globe,
    cases: [
      { id: "TC-OAUTH-001", title: "Authorization Redirect", precondition: "Third-party app registered", steps: ["Navigate to /authorize with app_id, redirect_uri, scope, state"], expected: "Consent screen with app name and scopes. Approve/Deny buttons.", status: "untested", notes: "" },
      { id: "TC-API-001", title: "Check Balance", precondition: "Valid credentials with balance scope", steps: ["GET /api-balance with headers"], expected: "Response: { balance, currency: 'MYR' }", status: "untested", notes: "" },
      { id: "TC-API-002", title: "Create Charge", precondition: "Valid credentials, sufficient balance", steps: ["POST /api-charge with amount, description"], expected: "Charge created with charge_id, transaction_id.", status: "untested", notes: "" },
      { id: "TC-API-003", title: "Refund Charge", precondition: "Completed charge exists", steps: ["POST /api-refund with charge_id"], expected: "Refund processed. Status → refunded.", status: "untested", notes: "" },
      { id: "TC-API-004", title: "Rate Limiting", precondition: "Valid credentials", steps: ["Send 31 charge requests within 1 minute"], expected: "31st request returns 429.", status: "untested", notes: "" },
    ]
  },
  {
    id: "nightly-reset", title: "Nightly Test Reset", icon: Database,
    cases: [
      { id: "TC-RESET-001", title: "Reverse All Test Transactions", precondition: "Test account (azarul@brainybunch.com) has completed transactions today", steps: ["Trigger nightly-test-reset with ?mode=reverse", "Verify all payment transactions are reversed", "Verify branch wallets debited back", "Verify cashback and commissions reversed", "Verify admin platform fees reversed"], expected: "All financial impacts from today's test transactions are fully reversed. Audit trail created.", status: "untested", notes: "" },
      { id: "TC-RESET-002", title: "Top Up After Reset", precondition: "Reversal mode completed", steps: ["Trigger nightly-test-reset with ?mode=topup", "Check test account wallet balance"], expected: "Test account wallet balance is exactly RM 1,000.00. Top-up transaction recorded.", status: "untested", notes: "" },
      { id: "TC-RESET-003", title: "Daily Email Report", precondition: "Reversal and top-up completed", steps: ["Trigger nightly-test-reset with ?mode=report", "Check email at azarul@brainybunch.com"], expected: "HTML email received with summary (counts, amounts) and detail table of all reversed transactions.", status: "untested", notes: "" },
      { id: "TC-RESET-004", title: "Referral Commission Reversal", precondition: "Test account made a payment that generated tier 1-5 commissions", steps: ["Run a payment as test user at a merchant", "Verify commissions distributed to referral ancestors", "Trigger ?mode=reverse", "Check each ancestor's wallet balance"], expected: "All tier 1-5 commission amounts debited back from each ancestor's wallet.", status: "untested", notes: "" },
      { id: "TC-RESET-005", title: "Skip Already Reversed Transactions", precondition: "Reversal already run once today", steps: ["Trigger ?mode=reverse again"], expected: "No duplicate reversals. Function skips already-reversed transactions. Idempotent.", status: "untested", notes: "" },
      { id: "TC-RESET-006", title: "Skip Own Reset Top-ups", precondition: "Previous nightly top-up exists", steps: ["Trigger ?mode=reverse", "Check that nightly reset top-ups are not reversed"], expected: "Transactions with description 'Nightly test reset top-up' are skipped.", status: "untested", notes: "" },
    ]
  },
  {
    id: "mobile", title: "Responsive / Mobile", icon: Smartphone,
    cases: [
      { id: "TC-MOBILE-001", title: "Mobile Navigation", precondition: "Mobile viewport (≤414px)", steps: ["Verify bottom nav is visible", "Tap each nav item"], expected: "Bottom nav shows Dashboard, Transactions, QR Pay, Profile.", status: "untested", notes: "" },
      { id: "TC-MOBILE-002", title: "Dashboard Mobile", precondition: "Logged in, mobile viewport", steps: ["Navigate to /dashboard"], expected: "Balance card, actions, transactions stack vertically.", status: "untested", notes: "" },
    ]
  },
];

const UatScripts = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "untested" | "pass" | "fail" | "blocked">("all");
  const [results, setResults] = useState<Record<string, TestCase["status"]>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [openModules, setOpenModules] = useState<string[]>(["auth"]);

  const getStatus = (id: string): TestCase["status"] => results[id] || "untested";

  const setStatus = (id: string, status: TestCase["status"]) => {
    setResults(prev => ({ ...prev, [id]: status }));
  };

  const totalCases = testModules.reduce((sum, m) => sum + m.cases.length, 0);
  const passCount = Object.values(results).filter(s => s === "pass").length;
  const failCount = Object.values(results).filter(s => s === "fail").length;
  const blockedCount = Object.values(results).filter(s => s === "blocked").length;
  const untestedCount = totalCases - passCount - failCount - blockedCount;

  const filteredModules = useMemo(() => {
    return testModules.map(m => ({
      ...m,
      cases: m.cases.filter(c => {
        const status = getStatus(c.id);
        const matchesFilter = filter === "all" || status === filter;
        const matchesSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
      })
    })).filter(m => m.cases.length > 0);
  }, [search, filter, results]);

  const resetAll = () => {
    setResults({});
    setNotes({});
  };

  const statusIcon = (status: TestCase["status"]) => {
    switch (status) {
      case "pass": return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "fail": return <XCircle className="h-4 w-4 text-red-400" />;
      case "blocked": return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      default: return <div className="h-4 w-4 rounded-full border-2 border-white/20" />;
    }
  };

  const statusBadge = (status: TestCase["status"]) => {
    const map = {
      pass: "bg-green-500/10 text-green-400 border-green-500/20",
      fail: "bg-red-500/10 text-red-400 border-red-500/20",
      blocked: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      untested: "bg-white/5 text-white/40 border-white/10"
    };
    return map[status];
  };

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-primary/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white/60 hover:text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <NocapLogo size="sm" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-white">UAT Test Scripts</h1>
              <p className="text-xs text-white/40">v1.0 — February 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/user-manual")} className="border-white/10 text-white/70 hover:bg-white/10 hover:text-white text-xs">
              <BookOpen className="mr-1.5 h-3.5 w-3.5" /> User Manual
            </Button>
            <Button variant="outline" size="sm" onClick={resetAll} className="border-white/10 text-white/70 hover:bg-white/10 hover:text-white text-xs">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-4 md:p-6">
        {/* Progress Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white font-display">{totalCases}</p>
              <p className="text-xs text-white/40">Total Cases</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/20 bg-green-500/5 cursor-pointer" onClick={() => setFilter(filter === "pass" ? "all" : "pass")}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-400 font-display">{passCount}</p>
              <p className="text-xs text-green-400/60">Passed</p>
            </CardContent>
          </Card>
          <Card className="border-red-500/20 bg-red-500/5 cursor-pointer" onClick={() => setFilter(filter === "fail" ? "all" : "fail")}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-400 font-display">{failCount}</p>
              <p className="text-xs text-red-400/60">Failed</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/20 bg-yellow-500/5 cursor-pointer" onClick={() => setFilter(filter === "blocked" ? "all" : "blocked")}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400 font-display">{blockedCount}</p>
              <p className="text-xs text-yellow-400/60">Blocked</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/5 cursor-pointer" onClick={() => setFilter(filter === "untested" ? "all" : "untested")}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white/40 font-display">{untestedCount}</p>
              <p className="text-xs text-white/30">Untested</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-white/40 mb-1">
            <span>Progress</span>
            <span>{Math.round(((passCount + failCount + blockedCount) / totalCases) * 100)}% tested</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden flex">
            <div className="bg-green-400 transition-all" style={{ width: `${(passCount / totalCases) * 100}%` }} />
            <div className="bg-red-400 transition-all" style={{ width: `${(failCount / totalCases) * 100}%` }} />
            <div className="bg-yellow-400 transition-all" style={{ width: `${(blockedCount / totalCases) * 100}%` }} />
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <Input
              placeholder="Search test cases..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 border-white/10 bg-white/5 text-white placeholder:text-white/30"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(["all", "untested", "pass", "fail", "blocked"] as const).map(f => (
              <Button
                key={f}
                variant="outline"
                size="sm"
                onClick={() => setFilter(f)}
                className={`text-xs capitalize ${filter === f ? "border-secondary bg-secondary/20 text-secondary font-semibold" : "border-white/20 bg-white/10 text-white/80 hover:bg-white/15 hover:text-white"}`}
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        {/* Test Modules */}
        <div className="space-y-3">
          {filteredModules.map(module => (
            <Collapsible
              key={module.id}
              open={openModules.includes(module.id)}
              onOpenChange={() => setOpenModules(prev => prev.includes(module.id) ? prev.filter(m => m !== module.id) : [...prev, module.id])}
            >
              <Card className="border-white/10 bg-white/5">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="p-4 flex flex-row items-center gap-3">
                    <module.icon className="h-5 w-5 text-secondary shrink-0" />
                    <div className="flex-1 text-left">
                      <CardTitle className="text-sm font-semibold text-white">{module.title}</CardTitle>
                      <p className="text-xs text-white/40 mt-0.5">{module.cases.length} test case{module.cases.length > 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {module.cases.filter(c => getStatus(c.id) === "pass").length > 0 && (
                        <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20">{module.cases.filter(c => getStatus(c.id) === "pass").length}✓</Badge>
                      )}
                      {module.cases.filter(c => getStatus(c.id) === "fail").length > 0 && (
                        <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20">{module.cases.filter(c => getStatus(c.id) === "fail").length}✗</Badge>
                      )}
                      {openModules.includes(module.id) ? <ChevronDown className="h-4 w-4 text-white/30" /> : <ChevronRight className="h-4 w-4 text-white/30" />}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-4 pb-4 space-y-3">
                    {module.cases.map(tc => {
                      const status = getStatus(tc.id);
                      return (
                        <Card key={tc.id} className={`border transition-colors ${status === "pass" ? "border-green-500/20 bg-green-500/5" : status === "fail" ? "border-red-500/20 bg-red-500/5" : status === "blocked" ? "border-yellow-500/20 bg-yellow-500/5" : "border-white/5 bg-white/[0.02]"}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                {statusIcon(status)}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] border-white/10 text-white/40 font-mono">{tc.id}</Badge>
                                    <h4 className="text-sm font-medium text-white">{tc.title}</h4>
                                  </div>
                                </div>
                              </div>
                              <Badge variant="outline" className={`text-[10px] capitalize ${statusBadge(status)}`}>{status}</Badge>
                            </div>

                            <div className="ml-6 space-y-3">
                              <div>
                                <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-1">Precondition</p>
                                <p className="text-xs text-white/50">{tc.precondition}</p>
                              </div>

                              <div>
                                <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-1">Steps</p>
                                <ol className="space-y-1">
                                  {tc.steps.map((step, i) => (
                                    <li key={i} className="flex gap-2 text-xs text-white/50">
                                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/5 text-[9px] font-bold text-white/30">{i + 1}</span>
                                      {step}
                                    </li>
                                  ))}
                                </ol>
                              </div>

                              <div>
                                <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-1">Expected Result</p>
                                <p className="text-xs text-white/50">{tc.expected}</p>
                              </div>

                              {/* Action buttons */}
                              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                                <Button size="sm" variant="outline" onClick={() => setStatus(tc.id, "pass")}
                                  className={`text-[10px] h-7 ${status === "pass" ? "border-green-500/30 bg-green-500/20 text-green-400 font-semibold" : "border-white/20 bg-white/10 text-white/80 hover:bg-white/15 hover:text-white"}`}>
                                  <CheckCircle className="mr-1 h-3 w-3" /> Pass
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setStatus(tc.id, "fail")}
                                  className={`text-[10px] h-7 ${status === "fail" ? "border-red-500/30 bg-red-500/20 text-red-400 font-semibold" : "border-white/20 bg-white/10 text-white/80 hover:bg-white/15 hover:text-white"}`}>
                                  <XCircle className="mr-1 h-3 w-3" /> Fail
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setStatus(tc.id, "blocked")}
                                  className={`text-[10px] h-7 ${status === "blocked" ? "border-yellow-500/30 bg-yellow-500/20 text-yellow-400 font-semibold" : "border-white/20 bg-white/10 text-white/80 hover:bg-white/15 hover:text-white"}`}>
                                  <AlertTriangle className="mr-1 h-3 w-3" /> Blocked
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setStatus(tc.id, "untested")}
                                  className="text-[10px] h-7 border-white/20 bg-white/10 text-white/80 hover:bg-white/15 hover:text-white">
                                  <RotateCcw className="mr-1 h-3 w-3" /> Reset
                                </Button>
                              </div>

                              {/* Notes */}
                              <Input
                                placeholder="Add notes..."
                                value={notes[tc.id] || ""}
                                onChange={e => setNotes(prev => ({ ...prev, [tc.id]: e.target.value }))}
                                className="text-xs h-8 border-white/5 bg-white/[0.02] text-white/60 placeholder:text-white/20"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>

        {/* Sign-Off */}
        <Card className="mt-8 border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-lg text-white font-display">Sign-Off</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["QA Lead", "Product Owner", "Dev Lead"].map(role => (
                <div key={role} className="space-y-2">
                  <p className="text-xs font-medium text-white/40">{role}</p>
                  <Input placeholder="Name" className="text-xs h-8 border-white/10 bg-white/5 text-white placeholder:text-white/20" />
                  <Input placeholder="Date" type="date" className="text-xs h-8 border-white/10 bg-white/5 text-white placeholder:text-white/20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-white/20 mt-8 pb-8">
          Generated for NoCap Wallet v1.0 — February 2026
        </p>
      </div>
    </div>
  );
};

export default UatScripts;
