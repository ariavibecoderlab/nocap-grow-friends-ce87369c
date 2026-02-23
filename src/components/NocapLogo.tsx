import nocapIcon from "@/assets/nocap-icon.png";
import nocapHorizontal from "@/assets/nocap-logo-horizontal.png";
import nocapStacked from "@/assets/nocap-logo-stacked.png";
import nocapIconOnly from "@/assets/nocap-icon-only.png";

type LogoVariant = "icon" | "horizontal" | "stacked" | "icon-only";

interface NocapLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: LogoVariant;
  className?: string;
}

const sizeMap = {
  sm: "h-[4.55rem]",
  md: "h-[6.5rem]",
  lg: "h-[10.4rem]",
};

const variantMap: Record<LogoVariant, string> = {
  icon: nocapIcon,
  horizontal: nocapHorizontal,
  stacked: nocapStacked,
  "icon-only": nocapIconOnly,
};

const NocapLogo = ({ size = "md", variant = "icon", className = "" }: NocapLogoProps) => {
  return (
    <img
      src={variantMap[variant]}
      alt="NOcap Logo"
      className={`${sizeMap[size]} w-auto object-contain ${className}`}
    />
  );
};

export default NocapLogo;
