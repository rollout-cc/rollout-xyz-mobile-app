import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, Check, X } from "lucide-react";

interface Props {
  teamId: string;
}

export function SupportAccessBanner({ teamId }: Props) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);

  const load = async () => {
    if (!teamId) return;
    const { data } = await supabase
      .from("support_access_requests")
      .select("*")
      .eq("team_id", teamId)
      .in("status", ["pending", "active"])
      .order("created_at", { ascending: false });
    setRequests(data || []);
  };

  useEffect(() => { load(); }, [teamId]);

  const handleAction = async (requestId: string, action: "approve_support_access" | "deny_support_access" | "revoke_support_access") => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-actions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ action, request_id: requestId }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(action === "approve_support_access" ? "Access granted" : action === "deny_support_access" ? "Access denied" : "Access revoked");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (requests.length === 0) return null;

  return (
    <div className="space-y-2">
      {requests.map(r => (
        <div
          key={r.id}
          className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${
            r.status === "pending"
              ? "border border-amber-500/30 bg-amber-500/5"
              : "border border-primary/20 bg-primary/5"
          }`}
        >
          <Shield className="h-4 w-4 shrink-0 text-primary" />
          <div className="flex-1 min-w-0">
            {r.status === "pending" ? (
              <p>
                <span className="font-medium">Rollout Support</span> is requesting temporary access to help with your team.
                {r.reason && <span className="text-muted-foreground"> — "{r.reason}"</span>}
              </p>
            ) : (
              <p>
                <span className="font-medium">Rollout Support</span> is currently viewing your team.
                <span className="text-xs text-muted-foreground ml-2">
                  Expires {new Date(r.expires_at).toLocaleTimeString()}
                </span>
              </p>
            )}
          </div>
          {r.status === "pending" ? (
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => handleAction(r.id, "deny_support_access")}>
                <X className="h-3.5 w-3.5 mr-1" /> Deny
              </Button>
              <Button size="sm" onClick={() => handleAction(r.id, "approve_support_access")}>
                <Check className="h-3.5 w-3.5 mr-1" /> Approve
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="destructive" onClick={() => handleAction(r.id, "revoke_support_access")}>
              Revoke Access
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
