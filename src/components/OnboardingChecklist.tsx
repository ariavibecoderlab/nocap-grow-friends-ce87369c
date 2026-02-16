import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, User, Phone, Shield, Image, MapPin, ChevronRight, Sparkles } from "lucide-react";

interface ChecklistProps {
  profile: {
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    address: string | null;
  } | null;
  hasPin: boolean;
  hasTransactions: boolean;
}

interface Step {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  done: boolean;
  action: string;
  path: string;
}

const OnboardingChecklist = ({ profile, hasPin, hasTransactions }: ChecklistProps) => {
  const navigate = useNavigate();

  const steps: Step[] = [
    {
      id: "name",
      label: "Add your name",
      description: "Let others know who you are",
      icon: User,
      done: !!profile?.full_name,
      action: "Update",
      path: "/profile",
    },
    {
      id: "phone",
      label: "Add phone number",
      description: "Required for transfers & security",
      icon: Phone,
      done: !!profile?.phone,
      action: "Add",
      path: "/profile",
    },
    {
      id: "avatar",
      label: "Upload profile photo",
      description: "Personalize your account",
      icon: Image,
      done: !!profile?.avatar_url,
      action: "Upload",
      path: "/my-profile",
    },
    {
      id: "pin",
      label: "Set your PIN",
      description: "Secure payments & transfers",
      icon: Shield,
      done: hasPin,
      action: "Set PIN",
      path: "/set-pin",
    },
    {
      id: "address",
      label: "Add your address",
      description: "Complete your profile",
      icon: MapPin,
      done: !!profile?.address,
      action: "Add",
      path: "/profile",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progress = (completedCount / steps.length) * 100;

  // Don't render if all steps are done
  if (completedCount === steps.length) return null;

  return (
    <Card className="border-white/10 bg-white/5 overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-secondary" />
            <h3 className="text-sm font-semibold text-white">Complete Your Profile</h3>
          </div>
          <span className="text-xs text-white/40 tabular-nums">{completedCount}/{steps.length}</span>
        </div>

        {/* Progress bar */}
        <Progress value={progress} className="h-1.5 bg-white/10 [&>div]:bg-secondary" />

        {/* Steps */}
        <div className="space-y-1">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                onClick={() => !step.done && navigate(step.path)}
                disabled={step.done}
                className={`flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors ${
                  step.done
                    ? "opacity-50 cursor-default"
                    : "hover:bg-white/5 cursor-pointer"
                }`}
              >
                {step.done ? (
                  <CheckCircle className="h-5 w-5 shrink-0 text-secondary" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-white/20" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${step.done ? "text-white/40 line-through" : "text-white"}`}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-white/30">{step.description}</p>
                </div>
                {!step.done && (
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/20" />
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default OnboardingChecklist;
