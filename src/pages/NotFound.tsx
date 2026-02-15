import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-foreground text-background">
      <div className="text-center">
        <h1 className="font-display text-6xl font-bold">4<span className="text-primary">0</span>4</h1>
        <p className="mt-4 text-lg text-background/60">Oops! Page not found</p>
        <a href="/" className="mt-6 inline-block rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-foreground hover:bg-primary/90 transition-colors">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
