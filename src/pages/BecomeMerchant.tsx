import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Store,
  TrendingUp,
  Users,
  Shield,
  Zap,
  BarChart3,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import NocapLogo from "@/components/NocapLogo";

const BecomeMerchant = () => {
  const navigate = useNavigate();

  const scrollToHowItWorks = () => {
    document
      .getElementById("how-it-works")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-primary text-white">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-primary/90 px-4 py-3 backdrop-blur-md">
        <NocapLogo size="sm" variant="horizontal" className="h-8" />
        <Button
          size="sm"
          className="bg-secondary text-primary font-semibold hover:bg-secondary/90"
          onClick={() => navigate("/merchant/register")}
        >
          Apply Now
        </Button>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-black/40 via-primary to-primary px-4 pb-16 pt-14 text-center">
        {/* Badge */}
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1.5 text-xs font-medium text-secondary">
          Malaysia's No.1 Affiliate Marketplace
        </span>

        <h1 className="font-display mb-4 text-3xl font-extrabold leading-tight tracking-tight text-white">
          Sell More. <span className="text-secondary">Pay Less.</span>
          <br />
          Grow Together.
        </h1>

        <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed text-white/70">
          Join 1000+ brands on NOcap — your products, promoted by our affiliate
          army. You only pay when a sale is confirmed.
        </p>

        {/* CTAs */}
        <div className="mx-auto mb-10 flex max-w-xs flex-col gap-3">
          <Button
            className="w-full bg-secondary text-primary font-bold text-base hover:bg-secondary/90"
            onClick={() => navigate("/merchant/register")}
          >
            Apply Now <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="w-full border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={scrollToHowItWorks}
          >
            See How It Works
          </Button>
        </div>

        {/* Mini Stats */}
        <div className="mx-auto grid max-w-sm grid-cols-3 gap-3">
          {[
            { value: "RM 0", label: "Setup Fee" },
            { value: "5-Tier", label: "Affiliates" },
            { value: "Pay Per", label: "Sale Only" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-secondary/20 bg-secondary/5 px-2 py-3"
            >
              <p className="text-base font-bold text-secondary">{stat.value}</p>
              <p className="text-xs text-white/50">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-4 py-14">
        <div className="mx-auto max-w-md">
          <h2 className="font-display mb-2 text-center text-2xl font-bold text-white">
            How It <span className="text-secondary">Works</span>
          </h2>
          <p className="mb-8 text-center text-sm text-white/50">
            Up and running in minutes.
          </p>

          <div className="space-y-4">
            {[
              {
                step: "1",
                icon: Shield,
                title: "Apply in 5 minutes",
                desc: "Submit your business details, KYC documents, and bank account. Fast approval in 1–3 business days.",
              },
              {
                step: "2",
                icon: Zap,
                title: "Set your commission rate",
                desc: "Decide how much you pay affiliates per confirmed sale. You're in control — minimum 5%, up to 30%.",
              },
              {
                step: "3",
                icon: TrendingUp,
                title: "Watch sales roll in",
                desc: "NOcap's affiliate network automatically promotes your products across 5 tiers of real promoters.",
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <Card key={step} className="border-white/10 bg-white/5">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-secondary/70">
                      Step {step}
                    </p>
                    <h3 className="mb-1 text-sm font-bold text-white">
                      {title}
                    </h3>
                    <p className="text-xs leading-relaxed text-white/60">
                      {desc}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why nocap */}
      <section className="bg-black/20 px-4 py-14">
        <div className="mx-auto max-w-md">
          <h2 className="font-display mb-2 text-center text-2xl font-bold text-white">
            Why <span className="text-secondary">NOcap?</span>
          </h2>
          <p className="mb-8 text-center text-sm text-white/50">
            Everything you need to grow.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                icon: CheckCircle,
                title: "No Upfront Cost",
                desc: "Zero setup fees, zero subscription. Only pay when you earn.",
              },
              {
                icon: Users,
                title: "5-Tier Affiliate Army",
                desc: "Thousands of promoters drive real traffic to your products.",
              },
              {
                icon: Store,
                title: "Your Own Brand Shop",
                desc: "Customise your storefront with your logo, banner, and products.",
              },
              {
                icon: BarChart3,
                title: "Real-time Analytics",
                desc: "Track orders, revenue, and affiliate performance live.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="border-white/10 bg-white/5">
                <CardContent className="p-4">
                  <Icon className="mb-3 h-6 w-6 text-secondary" />
                  <h3 className="mb-1 text-sm font-bold text-white">{title}</h3>
                  <p className="text-xs leading-relaxed text-white/55">
                    {desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Commission Explainer */}
      <section className="px-4 py-14">
        <div className="mx-auto max-w-md">
          <h2 className="font-display mb-2 text-center text-2xl font-bold text-white">
            Simple <span className="text-secondary">Commission</span> Model
          </h2>
          <p className="mb-8 text-center text-sm text-white/50">
            You set the rate. You keep the rest.
          </p>

          <Card className="border-secondary/20 bg-secondary/5">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-xs text-white/60">You set</span>
                <span className="text-sm font-bold text-secondary">
                  10% commission per sale
                </span>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex-1">
                  <p className="text-xs text-white/60">RM 100 sale</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-white/30" />
                <div className="flex-1 text-right">
                  <p className="text-xs text-white/60">RM 10 commission</p>
                  <p className="text-xs text-white/40">
                    split: nocap + affiliates
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-secondary/30 bg-secondary/10 px-4 py-3">
                <span className="text-xs font-semibold text-white">
                  You keep
                </span>
                <span className="text-lg font-extrabold text-secondary">
                  RM 90
                </span>
              </div>

              <p className="text-center text-xs text-white/40">
                Set your own rate from{" "}
                <span className="font-semibold text-secondary">5%</span> to{" "}
                <span className="font-semibold text-secondary">30%</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Strip */}
      <section className="bg-gradient-to-t from-black/40 to-primary px-4 pb-16 pt-12 text-center">
        <div className="mx-auto max-w-sm">
          <h2 className="font-display mb-2 text-2xl font-bold text-white">
            Ready to grow your <span className="text-secondary">brand?</span>
          </h2>
          <p className="mb-6 text-sm text-white/50">
            Free to apply. Approval in 1–3 business days.
          </p>
          <Button
            className="w-full bg-secondary text-primary font-bold text-base hover:bg-secondary/90"
            onClick={() => navigate("/merchant/register")}
          >
            Apply Now <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="mt-3 text-xs text-white/30">
            No credit card required. No monthly fees. Ever.
          </p>
        </div>
      </section>
    </div>
  );
};

export default BecomeMerchant;
