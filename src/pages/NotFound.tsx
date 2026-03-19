import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1
        className="font-black tracking-tighter text-foreground leading-[0.85] uppercase"
        style={{ fontSize: "clamp(12rem, 28vw, 24rem)" }}
      >
        404
      </h1>
      <div className="mt-6 space-y-2">
        <p className="text-lg font-semibold uppercase tracking-widest text-foreground">
          F*ck, something went wrong
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          A ROLLOUT team member just got an email because of this and will be fixing it soon
        </p>
      </div>
      <Button asChild className="mt-8">
        <Link to="/roster">Back to Roster</Link>
      </Button>
    </div>
  );
};

export default NotFound;
