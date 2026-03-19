import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Shield, Users } from "lucide-react";
import { toast } from "sonner";

interface AccessRequest {
  id: string;
  requester_id: string;
  request_type: string;
  detail: any;
  status: string;
  created_at: string;
  requester_name?: string;
  requester_avatar?: string | null;
}

export function PendingRequests() {
  const { selectedTeamId: teamId } = useSelectedTeam();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["access-requests", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_requests")
        .select("*")
        .eq("team_id", teamId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch requester profiles
      const userIds = [...new Set(data.map((r: any) => r.requester_id))];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

      return data.map((r: any) => ({
        ...r,
        requester_name: profileMap.get(r.requester_id)?.full_name || "Unknown",
        requester_avatar: profileMap.get(r.requester_id)?.avatar_url || null,
      })) as AccessRequest[];
    },
    enabled: !!teamId,
  });

  const handleRequest = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: "approved" | "denied" }) => {
      const request = requests.find((r) => r.id === requestId);
      if (!request) throw new Error("Request not found");

      // Update status
      const { error } = await supabase
        .from("access_requests")
        .update({ status: action, reviewed_by: (await supabase.auth.getUser()).data.user?.id })
        .eq("id", requestId);
      if (error) throw error;

      // If approved, apply the change
      if (action === "approved") {
        if (request.request_type === "permission_upgrade" && request.detail?.permission) {
          await supabase
            .from("team_memberships")
            .update({ [request.detail.permission]: true })
            .eq("team_id", teamId!)
            .eq("user_id", request.requester_id);
        }

        if (request.request_type === "artist_access" && request.detail?.artist_id) {
          // Upsert artist permission
          const { data: existing } = await supabase
            .from("artist_permissions")
            .select("id")
            .eq("user_id", request.requester_id)
            .eq("artist_id", request.detail.artist_id)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("artist_permissions")
              .update({ permission: "full_access" as any })
              .eq("id", existing.id);
          } else {
            await supabase
              .from("artist_permissions")
              .insert({
                user_id: request.requester_id,
                artist_id: request.detail.artist_id,
                permission: "full_access" as any,
              });
          }
        }
      }
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["access-requests", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-members", teamId] });
      queryClient.invalidateQueries({ queryKey: ["artist-permissions", teamId] });
      toast.success(action === "approved" ? "Request approved" : "Request denied");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to process request");
    },
  });

  if (isLoading || requests.length === 0) return null;

  const permLabelMap: Record<string, string> = {
    perm_view_finance: "View Finance",
    perm_manage_finance: "Manage Finance",
    perm_view_staff_salaries: "View Staff Salaries",
    perm_view_ar: "View A&R",
    perm_view_roster: "View Roster",
    perm_edit_artists: "Edit Artists",
    perm_view_billing: "View Billing",
    perm_distribution: "Distribution",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">Pending Requests</h3>
        <Badge variant="secondary" className="text-xs px-1.5 py-0">
          {requests.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {requests.map((req) => (
          <div
            key={req.id}
            className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
          >
            <Avatar className="h-8 w-8 mt-0.5">
              <AvatarImage src={req.requester_avatar ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {req.requester_name?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{req.requester_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {req.request_type === "permission_upgrade" ? (
                  <>
                    <Shield className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Requesting <span className="font-medium text-foreground">{permLabelMap[req.detail?.permission] || req.detail?.permission}</span> access
                    </p>
                  </>
                ) : (
                  <>
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Requesting access to <span className="font-medium text-foreground">{req.detail?.artist_name || "an artist"}</span>
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                onClick={() => handleRequest.mutate({ requestId: req.id, action: "approved" })}
                disabled={handleRequest.isPending}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleRequest.mutate({ requestId: req.id, action: "denied" })}
                disabled={handleRequest.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
