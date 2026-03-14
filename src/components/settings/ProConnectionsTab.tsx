import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Link2, Shield, Check, Loader2 } from "lucide-react";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const SOURCES = [
  { key: "bmi", name: "BMI", description: "Broadcast Music, Inc." },
  { key: "ascap", name: "ASCAP", description: "American Society of Composers" },
  { key: "sesac", name: "SESAC", description: "Society of European Stage Authors" },
  { key: "soundexchange", name: "SoundExchange", description: "Digital performance royalties" },
  { key: "mlc", name: "The MLC", description: "Mechanical Licensing Collective" },
] as const;

export function ProConnectionsTab() {
  const { currentTeam } = useSelectedTeam();
  const queryClient = useQueryClient();
  const [connectingSource, setConnectingSource] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: connections = [] } = useQuery({
    queryKey: ["pro-connections", currentTeam?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pro_connections")
        .select("*")
        .eq("team_id", currentTeam!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentTeam?.id,
  });

  const getConnection = (source: string) => connections.find((c: any) => c.source === source);

  const handleConnect = async () => {
    if (!currentTeam || !connectingSource || !email.trim()) return;
    setSaving(true);
    try {
      const existing = getConnection(connectingSource);
      if (existing) {
        const { error } = await supabase
          .from("pro_connections")
          .update({ account_email: email.trim(), status: "connected" })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("pro_connections")
          .insert({ team_id: currentTeam.id, source: connectingSource, account_email: email.trim(), status: "connected" });
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["pro-connections", currentTeam.id] });
      toast.success("Connection saved");
      setConnectingSource(null);
      setEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to save connection");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (source: string) => {
    if (!currentTeam) return;
    const conn = getConnection(source);
    if (!conn) return;
    try {
      await supabase.from("pro_connections").delete().eq("id", conn.id);
      queryClient.invalidateQueries({ queryKey: ["pro-connections", currentTeam.id] });
      toast.success("Disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground mb-1">PRO & MLC Connections</h2>
        <p className="text-sm text-muted-foreground">
          Link your performing rights and mechanical licensing accounts so Rollout can register works on your behalf.
        </p>
      </div>

      <div className="grid gap-3">
        {SOURCES.map((source) => {
          const conn = getConnection(source.key);
          const isConnected = conn?.status === "connected";

          return (
            <Card key={source.key} className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{source.name}</span>
                    {isConnected ? (
                      <Badge className="bg-primary/10 text-primary text-[10px]">
                        <Check className="h-2.5 w-2.5 mr-1" /> Connected
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Not Connected</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{source.description}</p>
                  {isConnected && conn?.account_email && (
                    <p className="text-xs text-muted-foreground mt-0.5">{conn.account_email}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {isConnected ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setConnectingSource(source.key);
                          setEmail(conn?.account_email || "");
                        }}
                      >
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDisconnect(source.key)}>
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setConnectingSource(source.key);
                        setEmail("");
                      }}
                    >
                      <Link2 className="h-3.5 w-3.5 mr-1.5" /> Connect
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!connectingSource} onOpenChange={(open) => { if (!open) { setConnectingSource(null); setEmail(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Connect to {SOURCES.find((s) => s.key === connectingSource)?.name}
            </DialogTitle>
            <DialogDescription>
              Enter the email associated with your account. Rollout will use this to register works on your behalf.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Account Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Your credentials are stored securely. Rollout only uses this information to register works and collect royalty data on your behalf.</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setConnectingSource(null); setEmail(""); }}>Cancel</Button>
              <Button onClick={handleConnect} disabled={saving || !email.trim()}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Save Connection"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
