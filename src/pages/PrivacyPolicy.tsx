import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import NocapLogo from "@/components/NocapLogo";

const sections = [
  {
    title: "1. Information We Collect",
    content: "We collect personal information you provide during registration (name, email, phone number, address), transaction data, device information, and usage analytics to improve our services."
  },
  {
    title: "2. How We Use Your Information",
    content: "Your data is used to process transactions, verify your identity, prevent fraud, calculate referral commissions, send notifications, and improve the platform experience. We may also use anonymized data for analytics."
  },
  {
    title: "3. Data Sharing",
    content: "We do not sell your personal data. Information may be shared with payment processors to complete transactions, regulatory authorities when required by law, and merchants only to the extent necessary to process your payments."
  },
  {
    title: "4. Data Security",
    content: "We employ industry-standard encryption and security measures to protect your data. Transaction PINs are hashed and never stored in plain text. All communications are encrypted using TLS."
  },
  {
    title: "5. Data Retention",
    content: "We retain your personal data for as long as your account is active and for a reasonable period thereafter for legal and business purposes. Transaction records are kept for a minimum of 7 years as required by Malaysian financial regulations."
  },
  {
    title: "6. Your Rights",
    content: "You have the right to access, correct, or request deletion of your personal data. You may update your profile information at any time through the app. To request account deletion, please contact our support team."
  },
  {
    title: "7. Cookies & Tracking",
    content: "We use essential cookies to maintain your session and preferences. We do not use third-party advertising trackers. Analytics data is collected in an anonymized format."
  },
  {
    title: "8. Changes to This Policy",
    content: "We may update this privacy policy periodically. Significant changes will be communicated via email or in-app notification. Continued use of the platform constitutes acceptance of the updated policy."
  },
  {
    title: "9. Contact",
    content: "For privacy-related inquiries, please contact our Data Protection Officer at privacy@nocap.my."
  },
];

const PrivacyPolicy = () => {
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
            <h1 className="font-display text-xl font-bold text-white">Privacy Policy</h1>
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

export default PrivacyPolicy;
