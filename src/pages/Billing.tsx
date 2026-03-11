import { useEffect } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PlanTab } from "@/components/settings/PlanTab";
import { BillingTab } from "@/components/settings/BillingTab";
import { useTeams } from "@/hooks/useTeams";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useTeamPlan } from "@/hooks/useTeamPlan";
import { toast } from "sonner";
import { useState } from "react";

type BillingSection = "plan" | "billing";

export default function Billing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: teams = [] } = useTeams();
  const { selectedTeamId } = useSelectedTeam();
  const { isPaid, isTrialing, refetch: refetchPlan } = useTeamPlan();
  const hasPaidAccess = isPaid || isTrialing;

  const myRole = teams.find((t) => t.id === selectedTeamId)?.role;
  const isOwnerOrManager = myRole === "team_owner" || myRole === "manager";

  const [activeSection, setActiveSection] = useState<BillingSection>("plan");

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      toast.success("Subscription activated! Welcome to Icon.");
      refetchPlan();
    }
  }, [searchParams, refetchPlan]);

  // Owners can always access billing (to upgrade); managers need paid access
  if (!isOwnerOrManager || (myRole !== "team_owner" && !hasPaidAccess)) {
    return <Navigate to="/settings" replace />;
  }

  const tabs: { key: BillingSection; label: string }[] = [
    { key: "plan", label: "Plan" },
    { key: "billing", label: "Billing" },
  ];

  return (
    <AppLayout title="Billing" onBack={() => navigate(-1)}>
      <div className="max-w-3xl">
        <div className="flex gap-1 mb-6">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeSection === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="border-t border-border" />

        {activeSection === "plan" && (
          <div className="mt-6">
            <PlanTab />
          </div>
        )}

        {activeSection === "billing" && (
          <div className="mt-6">
            <BillingTab />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
