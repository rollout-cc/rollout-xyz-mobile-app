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
      <div className="flex items-start gap-4">
        <h1
          className="font-black tracking-tighter text-foreground leading-[0.85] uppercase"
          style={{ fontSize: "clamp(10rem, 24vw, 20rem)" }}
        >
          F*CK
        </h1>
        <span className="mt-4 rounded bg-muted px-3 py-1 text-sm font-semibold text-muted-foreground tracking-wider uppercase">
          404
        </span>
      </div>
      <div className="mt-6 space-y-3">
        <p className="text-xl font-bold uppercase tracking-widest text-foreground">
          Something went wrong
        </p>
        <p className="text-sm font-semibold text-foreground">
          A ROLLOUT team member just got an email because of this and will be fixing it shortly
        </p>
      </div>
      <Button asChild className="mt-8">
        <Link to="/roster">Back to Roster</Link>
      </Button>
    </div>
  );
};

export default NotFound;
