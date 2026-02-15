import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { ArrowRight, Shield, Zap, Users } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="font-display text-5xl font-bold tracking-tight text-foreground md:text-6xl">
          NO<span className="text-primary">cap</span>
        </h1>
        <p className="mt-4 max-w-md text-lg text-muted-foreground">
          Earn cashback on every purchase. Grow your network, grow your rewards.
        </p>
        <Button size="lg" className="mt-8" onClick={() => navigate("/auth")}>
          Get Started <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        {/* Features */}
        <div className="mt-16 grid max-w-lg grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex flex-col items-center gap-2 rounded-xl bg-card p-6 shadow-sm">
            <Zap className="h-8 w-8 text-accent" />
            <h3 className="font-display font-semibold">Instant Cashback</h3>
            <p className="text-xs text-muted-foreground">Earn rewards on every QR payment</p>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-xl bg-card p-6 shadow-sm">
            <Users className="h-8 w-8 text-primary" />
            <h3 className="font-display font-semibold">5-Tier Referrals</h3>
            <p className="text-xs text-muted-foreground">Build your network, earn commissions</p>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-xl bg-card p-6 shadow-sm">
            <Shield className="h-8 w-8 text-success" />
            <h3 className="font-display font-semibold">Secure Wallet</h3>
            <p className="text-xs text-muted-foreground">PIN-protected transactions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
