import { Navigate } from "react-router-dom";
import { isNativeApp } from "@/lib/platform";

/**
 * Wrap routes that should NOT exist inside the native mobile shell
 * (marketplace, merchant tools, admin/support portals, etc).
 * On native, redirect to dashboard. On web, render children unchanged.
 */
const MobileBlocked = ({ children }: { children: JSX.Element }) => {
  if (isNativeApp()) return <Navigate to="/dashboard" replace />;
  return children;
};

export default MobileBlocked;
