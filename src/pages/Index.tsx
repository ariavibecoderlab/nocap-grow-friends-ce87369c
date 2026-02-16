import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import {
  ArrowRight,
  Percent,
  TrendingUp,
  Users,
  QrCode,
  ShieldCheck,
  Rocket,
  Zap,
} from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-primary text-primary-foreground">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <h2 className="font-display text-2xl font-bold text-white">
          <span className="inline-flex items-center gap-1">
            <Zap className="h-6 w-6 text-secondary fill-secondary" />
            NO<span className="text-secondary">cap</span>
          </span>
        </h2>
        <Button
          variant="outline"
          className="border-secondary bg-transparent text-secondary hover:bg-secondary hover:text-primary"
          onClick={() => navigate("/auth")}>
          Log In
        </Button>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center md:py-28">
        <div className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1.5 text-sm font-medium text-secondary">
          <Rocket className="h-4 w-4" /> Malaysia's #1 Cashback Wallet
        </div>

        <h1 className="mt-8 font-display text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl">
          Unlimited{" "}
          <span className="text-secondary"> Income </span>
          <br />
          On Every Purchase
        </h1>

        <p className="mt-6 max-w-xl text-lg text-white/60">
          Members earn cashback every time they pay and the affiliates income distributed up to 5 tier. Merchants grow their customer base 10× faster with built-in referral rewards.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Button
            size="lg"
            className="bg-secondary text-primary hover:bg-secondary/90 text-base font-semibold px-8"
            onClick={() => navigate("/auth")}>
            Start Earning Now <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/20 bg-transparent text-white hover:bg-white/10 text-base"
            onClick={() => {
              document.getElementById("merchants")?.scrollIntoView({ behavior: "smooth" });
            }}>
            I'm a Merchant
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 border-t border-white/10 pt-10 text-center md:gap-16">
          <div>
            <p className="font-display text-3xl font-bold text-secondary md:text-4xl">Minimum 2%</p>
            <p className="mt-1 text-sm text-white/50">Total Distributed Commission</p>
          </div>
          <div>
            <p className="font-display text-3xl font-bold text-secondary md:text-4xl">5-Tier</p>
            <p className="mt-1 text-sm text-white/50">Referral Network</p>
          </div>
          <div>
            <p className="font-display text-3xl font-bold text-secondary md:text-4xl">0%</p>
            <p className="mt-1 text-sm text-white/50">Hidden Fees</p>
          </div>
        </div>
      </section>

      {/* Member Benefits */}
      <section className="bg-background px-6 py-20 text-foreground md:px-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-3xl font-bold md:text-4xl">
            Why Members Love <span className="text-secondary">NOcap</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Every ringgit you spend earns you real rewards. No points, no gimmicks — just straight cashback into your wallet and you also get to Grow Your Own Affiliate Income! NOCAP!
          </p>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-8 transition-shadow hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
                <Percent className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold">Unlimited Cashback</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                No caps, no limits. Earn cashback on every single QR payment you make at any NOcap merchant.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-8 transition-shadow hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
                <Users className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold">Earn from Referrals</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Invite friends and earn commissions from their purchases — up to 5 tiers deep. Your network is your income.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-8 transition-shadow hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
                <ShieldCheck className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold">Secure & Instant</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                PIN-protected wallet with instant settlements. Your money is always safe and available.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Merchant Benefits */}
      <section id="merchants" className="bg-primary px-6 py-20 text-white md:px-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-3xl font-bold md:text-4xl">
            Grow Your Business <span className="text-secondary">10× Faster</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-white/60">
            NOcap turns every customer into a brand ambassador. Our built-in referral system brings you new customers on autopilot.
          </p>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/20">
                <QrCode className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold">QR-Based Payments</h3>
              <p className="mt-2 text-sm text-white/50">
                Accept payments instantly via QR code. No card terminals, no hardware costs. Just scan and pay.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/20">
                <TrendingUp className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold">Viral Customer Growth</h3>
              <p className="mt-2 text-sm text-white/50">
                Every customer who pays you becomes an ambassador. They refer friends who refer friends — and they all come to you.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/20">
                <Rocket className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold">Zero Setup Cost</h3>
              <p className="mt-2 text-sm text-white/50">
                Register as a merchant for free. Start accepting payments within minutes. Pay only a small commission per transaction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-secondary px-6 py-20 text-center text-primary md:px-12">
        <h2 className="font-display text-3xl font-bold md:text-4xl">
          Ready to Earn Without Limits?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-primary/70">
          Join Malaysia No 1 Affiliate Marketplace and build your unlimited income without any capital. It's free to sign up! NOCap
        </p>
        <Button
          size="lg"
          className="mt-8 bg-primary text-secondary hover:bg-primary/90 text-base font-semibold px-8"
          onClick={() => navigate("/auth")}>
          Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </section>

      {/* Footer */}
      <footer className="bg-primary px-6 py-10 text-center text-white/40 text-sm">
        <p>© 2026 NOcap. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Index;
