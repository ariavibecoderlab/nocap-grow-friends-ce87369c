import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import NocapLogo from "@/components/NocapLogo";

const About = () => {
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
            <h1 className="font-display text-xl font-bold text-white">About NOcap</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 space-y-4">
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-center py-4">
              <NocapLogo size="lg" />
            </div>
            <p className="text-center text-xs text-white/40">Version 1.0.0</p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-white">Our Mission</h2>
              <p className="text-xs text-white/60 leading-relaxed">
                NOcap is a cashback and rewards platform that empowers everyday consumers and local merchants. We believe that every ringgit spent should reward the spender — no cap on your earnings.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-white">How It Works</h2>
              <p className="text-xs text-white/60 leading-relaxed">
                When you pay at a participating merchant, you automatically earn cashback. Share your referral code with friends and earn commission from up to 5 tiers of your network. Merchants benefit from increased customer loyalty and foot traffic.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-white">For Merchants</h2>
              <p className="text-xs text-white/60 leading-relaxed">
                Merchants set a commission rate (minimum 2%) on transactions. A small 1% platform fee is deducted, and the rest is distributed as cashback and referral commissions — driving real customers to your business.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-white">Built in Malaysia 🇲🇾</h2>
              <p className="text-xs text-white/60 leading-relaxed">
                NOcap is proudly built and operated in Malaysia, designed for the local market and Malaysian businesses.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default About;
