import nocapLogo from "@/assets/nocap-logo.jpeg";

interface NocapLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-8",
  md: "h-12",
  lg: "h-20",
};

const NocapLogo = ({ size = "md", className = "" }: NocapLogoProps) => {
  return (
    <img
      src={nocapLogo}
      alt="NOcap Logo"
      className={`${sizeMap[size]} w-auto object-contain ${className}`}
    />
  );
};

export default NocapLogo;
