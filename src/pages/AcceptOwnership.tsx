import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, CheckCircle2 } from "lucide-react";
import rolloutLogo from "@/assets/rollout-logo.png";

export default function AcceptOwnership() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const [transfer, setTransfer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (!token) return;
    supabase
      .from("team_ownership_transfers")
      .select("*, teams(name)")
      .eq("token", token)
      .maybeSingle()
      .then(({ data }) => {
        setTransfer(data);
        setLoading(false);
        if (data?.status === "accepted") setAccepted(true);
      });
  }, [token]);

  const handleAccept = async () => {
    if (!user) { toast.error("Please sign in first"); return; }
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
          body: JSON.stringify({ action: "accept_transfer", token }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setAccepted(true);
      toast.success("Ownership accepted! You are now the team owner.");
    } catch (e: any) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  if (authLoading || loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4">
        <Link to="/"><img src={rolloutLogo} alt="Rollout" className="h-10" /></Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            {accepted ? (
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            ) : (
              <Shield className="h-12 w-12 text-primary mx-auto mb-3" />
            )}
            <CardTitle className="text-xl">
              {accepted ? "Ownership Accepted" : "Team Ownership Transfer"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!transfer ? (
              <p className="text-center text-muted-foreground">This transfer link is invalid or has already been used.</p>
            ) : accepted ? (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  You are now the owner of <strong>{(transfer as any).teams?.name || "your team"}</strong>.
                  Your data is yours — no one at Rollout can access your account or data without your explicit written consent.
                </p>
                <Button asChild><Link to="/roster">Go to Dashboard</Link></Button>
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm space-y-3">
                  <p>
                    You are being invited to take full ownership of{" "}
                    <strong>{(transfer as any).teams?.name || "a team"}</strong> on Rollout.
                  </p>
                  <p className="font-medium">By accepting ownership, you acknowledge:</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>You will become the sole owner of this team and all its data</li>
                    <li>No one at Rollout can access your account or data without your explicit written consent</li>
                    <li>You are responsible for the content and data within this team</li>
                    <li>This transfer is logged and timestamped for your security</li>
                  </ul>
                </div>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} className="rounded mt-1" />
                  <span className="text-sm text-muted-foreground">
                    I understand and accept ownership of this team and its data, and I acknowledge that Rollout
                    cannot access my account without my written consent per their{" "}
                    <Link to="/privacy" className="underline text-foreground">Privacy Policy</Link>.
                  </span>
                </label>

                {!user && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Please <Link to="/login" className="underline font-medium">sign in</Link> first to accept this transfer.
                  </p>
                )}

                <Button onClick={handleAccept} disabled={busy || !acknowledged || !user} className="w-full">
                  {busy ? "Accepting…" : "Accept Ownership"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-sm text-muted-foreground">
        <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
        <span className="mx-2">·</span>
        <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
      </footer>
    </div>
  );
}
