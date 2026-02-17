import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import NocapLogo from "@/components/NocapLogo";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: "By accessing or using the NOcap platform, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use our services."
  },
  {
    title: "2. Account Registration",
    content: "You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must be at least 18 years old to use this service."
  },
  {
    title: "3. Wallet & Transactions",
    content: "Your NOcap wallet is a digital stored-value facility. Funds in your wallet can be used for payments to participating merchants. All transactions are final once confirmed. Top-up amounts are subject to minimum and maximum limits as determined by the platform."
  },
  {
    title: "4. Cashback & Commission",
    content: "Cashback is earned on qualifying transactions at participating merchants. Commission is earned through the referral program across up to 5 tiers. The platform reserves the right to modify cashback and commission rates at any time with prior notice."
  },
  {
    title: "5. Referral Program",
    content: "Members may refer others using their unique referral code. Abuse of the referral system, including self-referrals or fraudulent accounts, will result in forfeiture of earnings and possible account suspension."
  },
  {
    title: "6. Merchant Obligations",
    content: "Merchants must maintain valid business registration and comply with all applicable laws. Merchants are responsible for the accuracy of their business information and must honour all transactions processed through the platform."
  },
  {
    title: "7. Prohibited Activities",
    content: "Users must not engage in money laundering, fraud, or any illegal activity. Attempting to manipulate the system, exploit bugs, or create multiple accounts is strictly prohibited and will result in immediate account termination."
  },
  {
    title: "8. Limitation of Liability",
    content: "NOcap shall not be liable for any indirect, incidental, or consequential damages arising from the use of the platform. Our total liability shall not exceed the balance in your wallet at the time of the claim."
  },
  {
    title: "9. Modifications",
    content: "We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the updated terms. Material changes will be communicated via email or in-app notification."
  },
  {
    title: "10. Governing Law",
    content: "These terms are governed by and construed in accordance with the laws of Malaysia. Any disputes shall be subject to the exclusive jurisdiction of Malaysian courts."
  },
];

const TermsConditions = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="px-4 pt-8 pb-6">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10" onClick={() => navigate("/profile")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <NocapLogo size="sm" />
            <h1 className="font-display text-xl font-bold text-white">Terms & Conditions</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-5 space-y-5">
            <p className="text-xs text-white/40">Last updated: February 2026</p>
            {sections.map((s, i) => (
              <div key={i} className="space-y-1">
                <h2 className="text-sm font-semibold text-white">{s.title}</h2>
                <p className="text-xs text-white/60 leading-relaxed">{s.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default TermsConditions;
