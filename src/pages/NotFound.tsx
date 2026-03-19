import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import RolloutFlag from "@/assets/rollout-flag.svg";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <img
        src={RolloutFlag}
        alt="Rollout flag"
        className="mb-8 h-32 w-32 animate-flag-wave"
      />
      <h1 className="mb-4 text-7xl font-black tracking-tight text-foreground">404</h1>
      <p className="mb-2 text-xl font-semibold text-foreground">
        F*ck, something went wrong
      </p>
      <p className="mb-8 max-w-sm text-sm text-muted-foreground">
        A ROLLOUT team member just got an email because of this and will be fixing soon
      </p>
      <Button asChild>
        <Link to="/roster">Back to Roster</Link>
      </Button>
    </div>
  );
};

export default NotFound;
