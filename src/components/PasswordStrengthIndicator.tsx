import { useMemo } from "react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

function getStrength(password: string): { level: number; label: string; color: string } {
  if (!password) return { level: 0, label: "", color: "" };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: "Weak", color: "bg-red-500" };
  if (score <= 3) return { level: 2, label: "Medium", color: "bg-yellow-500" };
  return { level: 3, label: "Strong", color: "bg-green-500" };
}

const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const strength = useMemo(() => getStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= strength.level ? strength.color : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${
        strength.level === 1 ? "text-red-400" :
        strength.level === 2 ? "text-yellow-400" : "text-green-400"
      }`}>
        {strength.label}
      </p>
    </div>
  );
};

export default PasswordStrengthIndicator;
