import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Link2, Shield, Check, Loader2 } from "lucide-react";
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

interface MemberConnectionsProps {
  memberId: string;
}

export function MemberConnections({ memberId }: MemberConnectionsProps) {
  const queryClient = useQueryClient();
  const [connectingSource, setConnectingSource] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: connections = [] } = useQuery({
    queryKey: ["member-pro-connections", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pro_connections")
        .select("*")
        .eq("member_id", memberId);
      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
  });

  const getConnection = (source: string) => connections.find((c: any) => c.source === source);

  const handleConnect = async () => {
    if (!memberId || !connectingSource || !email.trim()) return;
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
        // We need a team_id — get it from the member's artist
        const { data: member } = await supabase
          .from("artist_travel_info")
          .select("artist_id")
          .eq("id", memberId)
          .single();
        if (!member) throw new Error("Member not found");
        const { data: artist } = await supabase
          .from("artists")
          .select("team_id")
          .eq("id", member.artist_id)
          .single();
        if (!artist) throw new Error("Artist not found");

        const { error } = await supabase
          .from("pro_connections")
          .insert({
            team_id: artist.team_id,
            member_id: memberId,
            source: connectingSource,
            account_email: email.trim(),
            status: "connected",
          } as any);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["member-pro-connections", memberId] });
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
    const conn = getConnection(source);
    if (!conn) return;
    try {
      await supabase.from("pro_connections").delete().eq("id", conn.id);
      queryClient.invalidateQueries({ queryKey: ["member-pro-connections", memberId] });
      toast.success("Disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid gap-2">
        {SOURCES.map((source) => {
          const conn = getConnection(source.key);
          const isConnected = conn?.status === "connected";

          return (
            <div key={source.key} className="flex items-center gap-3 p-2.5 rounded-md border border-border bg-background">
              <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground">{source.name}</span>
                  {isConnected ? (
                    <Badge className="bg-primary/10 text-primary text-[9px] px-1.5 py-0">
                      <Check className="h-2 w-2 mr-0.5" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Not Connected</Badge>
                  )}
                </div>
                {isConnected && conn?.account_email && (
                  <p className="text-[10px] text-muted-foreground truncate">{conn.account_email}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                {isConnected ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => {
                        setConnectingSource(source.key);
                        setEmail(conn?.account_email || "");
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => handleDisconnect(source.key)}>
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => {
                      setConnectingSource(source.key);
                      setEmail("");
                    }}
                  >
                    <Link2 className="h-3 w-3 mr-1" /> Connect
                  </Button>
                )}
              </div>
            </div>
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
              Enter the email associated with this member's account.
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
