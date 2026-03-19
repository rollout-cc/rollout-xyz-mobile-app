import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Shield, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function OwnershipTransferBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transfer, setTransfer] = useState<any>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("team_ownership_transfers")
      .select("*, teams(name)")
      .eq("to_user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setTransfer(data);
      });
  }, [user]);

  if (!transfer) return null;

  const teamName = (transfer as any).teams?.name || "your team";

  const handleAccept = async () => {
    setBusy(true);
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
          body: JSON.stringify({ action: "accept_transfer", token: transfer.token }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setAccepted(true);
      toast.success("Ownership accepted! You are now the team owner.");
      setTimeout(() => {
        setTransfer(null);
        window.location.reload();
      }, 2000);
    } catch (e: any) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  return (
    <Dialog open={!!transfer} onOpenChange={() => { /* non-dismissable */ }}>
      <DialogContent
        className="max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center items-center">
          {accepted ? (
            <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
          ) : (
            <Shield className="h-10 w-10 text-primary mb-2" />
          )}
          <DialogTitle className="text-xl">
            {accepted ? "Ownership Accepted!" : "You've Been Given Ownership"}
          </DialogTitle>
          <DialogDescription>
            {accepted
              ? `You are now the owner of "${teamName}".`
              : `The Rollout team has transferred ownership of "${teamName}" to you.`}
          </DialogDescription>
        </DialogHeader>

        {accepted ? (
          <div className="text-center space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Your data is yours — no one at Rollout can access your account or data without your explicit written consent.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm space-y-3">
              <p className="font-medium">By accepting ownership, you acknowledge:</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>You will become the sole owner of <strong>{teamName}</strong> and all its data</li>
                <li>No one at Rollout can access your account or data without your explicit written consent</li>
                <li>You are responsible for the content and data within this team</li>
                <li>This transfer is logged and timestamped for your security</li>
              </ul>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={e => setAcknowledged(e.target.checked)}
                className="rounded mt-1"
              />
              <span className="text-sm text-muted-foreground">
                I understand and accept ownership of this team and its data, and I acknowledge that Rollout
                cannot access my account without my written consent per their{" "}
                <a href="/privacy" className="underline text-foreground" target="_blank" rel="noreferrer">Privacy Policy</a>.
              </span>
            </label>

            <div className="flex gap-2">
              <Button onClick={handleAccept} disabled={busy || !acknowledged} className="flex-1">
                {busy ? "Accepting…" : "Accept Ownership"}
              </Button>
              <Button variant="outline" onClick={() => navigate(`/accept-ownership/${transfer.token}`)}>
                View Full Details
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
