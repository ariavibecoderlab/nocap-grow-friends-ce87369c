import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, Mail, Phone, Bot, Sparkles, Ticket } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import NocapLogo from "@/components/NocapLogo";
import AiHelpChat from "@/components/AiHelpChat";

const HelpSupport = () => {
  const navigate = useNavigate();
  const [showChat, setShowChat] = useState(false);

  const faqs = [
    { q: "How do I top up my wallet?", a: "Go to Dashboard → Top Up, enter the amount and complete the payment via our payment gateway. Your balance will be updated once the payment is confirmed." },
    { q: "How does cashback work?", a: "Every time you make a payment to a merchant, you automatically receive cashback based on the merchant's commission rate. The cashback is credited instantly to your wallet." },
    { q: "How do I earn commission?", a: "Share your referral code with friends. When they sign up and make transactions, you earn commission from up to 5 tiers of your referral network." },
    { q: "How do I withdraw my earnings?", a: "Currently, withdrawals are available for merchants. As a member, your earnings stay in your wallet and can be used for payments." },
    { q: "I forgot my PIN. What should I do?", a: "Contact our support team via email and we'll help you reset your transaction PIN after verifying your identity." },
    { q: "Is my money safe?", a: "Yes. All transactions are encrypted and processed through secure payment gateways. Your funds are held safely in your digital wallet." },
  ];

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="px-4 pt-8 pb-6">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10" onClick={() => navigate("/profile")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <NocapLogo size="sm" />
            <h1 className="font-display text-xl font-bold text-white">Help & Support</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 space-y-4">
        {/* AI Assistant Card */}
        <Card className="border-secondary/30 bg-secondary/10 cursor-pointer hover:bg-secondary/15 transition-colors" onClick={() => setShowChat(true)}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
              <Bot className="h-5 w-5 text-secondary" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-sm font-semibold text-white flex items-center gap-1.5">
                Chat with AI Assistant
                <Sparkles className="h-3.5 w-3.5 text-secondary" />
              </h2>
              <p className="text-[10px] text-white/50">Get instant answers about NoCap, orders, products & more</p>
            </div>
            <MessageCircle className="h-4 w-4 text-secondary shrink-0" />
          </CardContent>
        </Card>

        {showChat && <AiHelpChat defaultOpen />}

        {/* Contact */}
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-5 space-y-3">
            <h2 className="font-display text-sm font-semibold text-white">Contact Us</h2>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <Mail className="h-4 w-4 text-secondary shrink-0" />
              <span>salam.zulkarnain@brainybunch.com</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <Phone className="h-4 w-4 text-secondary shrink-0" />
              <span>+6017-6976479</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <MessageCircle className="h-4 w-4 text-secondary shrink-0" />
              <span>WhatsApp: +6017-6976479</span>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-5 space-y-4">
            <h2 className="font-display text-sm font-semibold text-white">Frequently Asked Questions</h2>
            {faqs.map((faq, i) => (
              <div key={i} className="space-y-1">
                <p className="text-sm font-medium text-white/90">{faq.q}</p>
                <p className="text-xs text-white/50 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default HelpSupport;
