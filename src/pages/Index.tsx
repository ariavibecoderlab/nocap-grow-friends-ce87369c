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
} from "lucide-react";
import NocapLogo from "@/components/NocapLogo";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.03, y: -4, transition: { duration: 0.25, ease: "easeOut" as const } },
};

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-primary text-primary-foreground overflow-hidden">
      {/* Nav */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between px-6 py-5 md:px-12"
      >
        <NocapLogo size="sm" />
        <Button
          variant="outline"
          className="border-secondary bg-transparent text-secondary hover:bg-secondary hover:text-primary"
          onClick={() => navigate("/auth")}
        >
          Log In
        </Button>
      </motion.header>

      {/* Hero */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-6 py-20 text-center md:py-28">
        {/* Animated gradient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-secondary/15 blur-[120px]"
            animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-40 -right-32 h-[400px] w-[400px] rounded-full bg-secondary/10 blur-[100px]"
            animate={{ x: [0, -50, 0], y: [0, -30, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-secondary/8 blur-[80px]"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          custom={0}
          variants={fadeUp}
          className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1.5 text-sm font-medium text-secondary"
        >
          Malaysia's #1 Affiliate Marketplace
          <Rocket className="h-4 w-4" /> Malaysia's #1 Cashback Wallet
        </motion.div>

        <motion.h1
          initial="hidden"
          animate="visible"
          custom={1}
          variants={fadeUp}
          className="mt-8 font-display text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl"
        >
          Unlimited{" "}
          <motion.span
            className="text-secondary inline-block"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.6, type: "spring", stiffness: 200 }}
          >
            Income
          </motion.span>
          <br />
          On Every Purchase
        </motion.h1>

        <motion.p
          initial="hidden"
          animate="visible"
          custom={2}
          variants={fadeUp}
          className="mt-6 max-w-xl text-lg text-white/60"
        >
          Members earn cashback every time they pay and the affiliates income distributed up to 5 tier. Merchants grow their customer base 10× faster with built-in referral rewards.
        </motion.p>

        <motion.div
          initial="hidden"
          animate="visible"
          custom={3}
          variants={fadeUp}
          className="mt-10 flex flex-col gap-4 sm:flex-row"
        >
          <Button
            size="lg"
            className="bg-secondary text-primary hover:bg-secondary/90 text-base font-semibold px-8"
            onClick={() => navigate("/auth")}
          >
            Start Earning Now <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/20 bg-transparent text-white hover:bg-white/10 text-base"
            onClick={() => {
              document.getElementById("merchants")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            I'm a Merchant
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="mt-16 grid grid-cols-3 gap-8 border-t border-white/10 pt-10 text-center md:gap-16"
        >
          {[
            { value: "Minimum 2%", label: "Total Distributed Commission" },
            { value: "5-Tier", label: "Referral Network" },
            { value: "0%", label: "Hidden Fees" },
          ].map((stat, i) => (
            <motion.div key={i} variants={scaleIn}>
              <p className="font-display text-3xl font-bold text-secondary md:text-4xl">{stat.value}</p>
              <p className="mt-1 text-sm text-white/50">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
        </div>
      </section>

      {/* Member Benefits */}
      <section className="bg-background px-6 py-20 text-foreground md:px-12">
        <div className="mx-auto max-w-5xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            custom={0}
            variants={fadeUp}
            className="text-center font-display text-3xl font-bold md:text-4xl"
          >
            Why Members Love <span className="text-secondary">NOcap</span>
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            custom={1}
            variants={fadeUp}
            className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground"
          >
            Every ringgit you spend earns you real rewards. No points, no gimmicks — just straight cashback into your wallet and you also get to Grow Your Own Affiliate Income! NOCAP!
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerContainer}
            className="mt-14 grid gap-8 md:grid-cols-3"
          >
            {[
              { icon: Percent, title: "Unlimited Cashback", desc: "No caps, no limits. Earn cashback on every single QR payment you make at any NOcap merchant." },
              { icon: Users, title: "Earn from Referrals", desc: "Invite friends and earn commissions from their purchases — up to 5 tiers deep. Your network is your income." },
              { icon: ShieldCheck, title: "Secure & Instant", desc: "PIN-protected wallet with instant settlements. Your money is always safe and available." },
            ].map((card, i) => (
              <motion.div
                key={i}
                variants={scaleIn}
                initial="rest"
                whileHover="hover"
              >
                <motion.div
                  variants={cardHover}
                  className="rounded-2xl border border-border bg-card p-8 transition-shadow hover:shadow-lg h-full"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
                    <card.icon className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold">{card.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{card.desc}</p>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Merchant Benefits */}
      <section id="merchants" className="bg-primary px-6 py-20 text-white md:px-12">
        <div className="mx-auto max-w-5xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            custom={0}
            variants={fadeUp}
            className="text-center font-display text-3xl font-bold md:text-4xl"
          >
            Grow Your Business <span className="text-secondary">10× Faster</span>
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            custom={1}
            variants={fadeUp}
            className="mx-auto mt-4 max-w-2xl text-center text-white/60"
          >
            NOcap turns every customer into a brand ambassador. Our built-in referral system brings you new customers on autopilot.
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerContainer}
            className="mt-14 grid gap-8 md:grid-cols-3"
          >
            {[
              { icon: QrCode, title: "QR-Based Payments", desc: "Accept payments instantly via QR code. No card terminals, no hardware costs. Just scan and pay." },
              { icon: TrendingUp, title: "Viral Customer Growth", desc: "Every customer who pays you becomes an ambassador. They refer friends who refer friends — and they all come to you." },
              { icon: Rocket, title: "Zero Setup Cost", desc: "Register as a merchant for free. Start accepting payments within minutes. Pay only a small commission per transaction." },
            ].map((card, i) => (
              <motion.div
                key={i}
                variants={scaleIn}
                initial="rest"
                whileHover="hover"
              >
                <motion.div
                  variants={cardHover}
                  className="rounded-2xl border border-white/10 bg-white/5 p-8 h-full"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/20">
                    <card.icon className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold">{card.title}</h3>
                  <p className="mt-2 text-sm text-white/50">{card.desc}</p>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
        className="bg-secondary px-6 py-20 text-center text-primary md:px-12"
      >
        <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-4xl">
          Ready to Earn Without Limits?
        </motion.h2>
        <motion.p variants={fadeUp} custom={1} className="mx-auto mt-4 max-w-lg text-primary/70">
          Join Malaysia No 1 Affiliate Marketplace and build your unlimited income without any capital. It's free to sign up! NOCap
        </motion.p>
        <motion.div variants={fadeUp} custom={2}>
          <Button
            size="lg"
            className="mt-8 bg-primary text-secondary hover:bg-primary/90 text-base font-semibold px-8"
            onClick={() => navigate("/auth")}
          >
            Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </motion.section>

      {/* Footer */}
      <footer className="bg-primary px-6 py-10 text-center text-white/40 text-sm">
        <div className="flex flex-col items-center gap-3">
          <NocapLogo size="sm" />
          <p>© 2026 NOcap. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
