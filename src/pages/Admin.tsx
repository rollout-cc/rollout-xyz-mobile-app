import { useState, useEffect, useCallback } from "react";
import rolloutLogo from "@/assets/rollout-logo.png";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useNavigate } from "react-router-dom";
import { FeedbackDashboard } from "@/components/admin/FeedbackDashboard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, UserPlus, Building2, ArrowRightLeft, Gift, Headset, LogOut, Check, ChevronsUpDown, ChevronDown, Settings2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.rpc("is_platform_admin", { p_user_id: user.id }).then(({ data }) => setIsAdmin(!!data));
  }, [user]);
  return isAdmin;
}

async function adminAction(action: string, payload: Record<string, unknown> = {}) {
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
      body: JSON.stringify({ action, ...payload }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Action failed");
  return json;
}

/* ─── Searchable Combobox ─── */
interface ComboItem { id: string; label: string; name: string; email?: string }

function SearchableCombobox({
  label,
  placeholder,
  action,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  action: "list_users" | "list_teams";
  value: string;
  onChange: (id: string, item?: ComboItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ComboItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadItems = useCallback(async () => {
    if (items.length > 0) return;
    setLoading(true);
    try {
      const res = await adminAction(action);
      setItems(res.items || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [action, items.length]);

  const selectedItem = items.find(i => i.id === value);

  return (
    <div>
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) loadItems(); }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-10 text-left"
          >
            <span className="truncate">
              {selectedItem ? selectedItem.label : <span className="text-muted-foreground">{placeholder}</span>}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
            <CommandList>
              {loading ? (
                <div className="py-4 text-center text-sm text-muted-foreground">Loading…</div>
              ) : (
                <>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup>
                    {items.map(item => (
                      <CommandItem
                        key={item.id}
                        value={item.label}
                        onSelect={() => { onChange(item.id, item); setOpen(false); }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", value === item.id ? "opacity-100" : "opacity-0")} />
                        {item.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function Admin() {
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();

  if (loading || isAdmin === null) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user || !isAdmin) { navigate("/roster"); return null; }

  return (
    <div className="h-dvh overflow-y-auto bg-background">
      <header className="border-b border-border px-6 py-4 flex items-end gap-3">
        <button onClick={() => navigate("/roster")} className="hover:opacity-80 transition-opacity">
          <img src={rolloutLogo} alt="Rollout" className="h-10" />
        </button>
        <span className="text-muted-foreground text-base font-medium leading-none pb-px">Admin Console</span>
        <Badge variant="outline" className="ml-auto">Super Admin</Badge>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        <CreateUserSection />
        <Separator />
        <TransferOwnershipSection />
        <Separator />
        <SupportAccessSection />
        <Separator />
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
              <span className="flex items-center gap-2"><Settings2 className="h-4 w-4" /> Advanced Actions</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-6 pt-4">
            <CreateTeamSection />
            <Separator />
            <GrantTrialSection />
          </CollapsibleContent>
        </Collapsible>
        <Separator />
        <FeedbackDashboard />
      </main>
    </div>
  );
}

/* ─── Create User ─── */
function CreateUserSection() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("team_owner");
  const [teamName, setTeamName] = useState("");
  const [trialDays, setTrialDays] = useState(30);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { email, full_name: name, password, role };
      if (role === "team_owner" && teamName) {
        payload.team_name = teamName;
        payload.trial_days = trialDays;
      }
      const res = await adminAction("create_user", payload);
      const msg = res.team_name
        ? `Created ${res.full_name} (${res.email}) with team "${res.team_name}"`
        : `Created ${res.full_name} (${res.email})`;
      toast.success(msg);
      setEmail(""); setName(""); setPassword(""); setTeamName("");
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Create User</CardTitle>
        <CardDescription>Create a new account for a client during onboarding</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Full Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" /></div>
          <div><Label>Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" type="email" /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Temporary Password</Label><Input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" /></div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="team_owner">Owner</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="artist">Artist</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {role === "team_owner" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-border p-4 bg-muted/30">
            <div><Label>Team Name</Label><Input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Acme Records" /></div>
            <div><Label>Trial Days</Label><Input type="number" min={1} max={365} value={trialDays} onChange={e => setTrialDays(Number(e.target.value))} /></div>
          </div>
        )}
        <Button onClick={submit} disabled={busy || !email || !name || !password}>{busy ? "Creating…" : "Create User"}</Button>
      </CardContent>
    </Card>
  );
}

/* ─── Create Team ─── */
function CreateTeamSection() {
  const [name, setName] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await adminAction("create_team", { name, owner_user_id: ownerId });
      toast.success(`Team "${res.team_name}" created for ${ownerName || "selected owner"}`);
      setName(""); setOwnerId(""); setOwnerName("");
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Create Team</CardTitle>
        <CardDescription>Set up a new team for an existing user</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Team Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Acme Records" /></div>
          <SearchableCombobox
            label="Owner"
            placeholder="Search users…"
            action="list_users"
            value={ownerId}
            onChange={(id, item) => { setOwnerId(id); setOwnerName(item?.name || ""); }}
          />
        </div>
        <Button onClick={submit} disabled={busy || !name || !ownerId}>{busy ? "Creating…" : "Create Team"}</Button>
      </CardContent>
    </Card>
  );
}

/* ─── Grant Trial ─── */
function GrantTrialSection() {
  const [teamId, setTeamId] = useState("");
  const [teamLabel, setTeamLabel] = useState("");
  const [days, setDays] = useState(14);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await adminAction("grant_trial", { team_id: teamId, trial_days: days });
      toast.success(`Trial granted for "${res.team_name || teamLabel}" until ${new Date(res.trial_ends_at).toLocaleDateString()}`);
      setTeamId(""); setTeamLabel("");
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5" /> Grant Trial</CardTitle>
        <CardDescription>Set or extend a team's trial period</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SearchableCombobox
            label="Team"
            placeholder="Search teams…"
            action="list_teams"
            value={teamId}
            onChange={(id, item) => { setTeamId(id); setTeamLabel(item?.name || ""); }}
          />
          <div><Label>Trial Duration (days)</Label><Input type="number" min={1} max={365} value={days} onChange={e => setDays(Number(e.target.value))} /></div>
        </div>
        <Button onClick={submit} disabled={busy || !teamId}>{busy ? "Granting…" : "Grant Trial"}</Button>
      </CardContent>
    </Card>
  );
}

/* ─── Transfer Ownership ─── */
function TransferOwnershipSection() {
  const [teamId, setTeamId] = useState("");
  const [teamLabel, setTeamLabel] = useState("");
  const [toUserId, setToUserId] = useState("");
  const [toUserLabel, setToUserLabel] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await adminAction("initiate_transfer", { team_id: teamId, to_user_id: toUserId });
      toast.success(`Transfer initiated for "${res.team_name}" → ${res.recipient_name}. Email sent to ${res.recipient_email}.`);
      setTeamId(""); setTeamLabel(""); setToUserId(""); setToUserLabel(""); setAcknowledged(false);
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" /> Transfer Ownership</CardTitle>
        <CardDescription>Hand off team ownership to the client</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SearchableCombobox
            label="Team"
            placeholder="Search teams…"
            action="list_teams"
            value={teamId}
            onChange={(id, item) => { setTeamId(id); setTeamLabel(item?.name || ""); }}
          />
          <SearchableCombobox
            label="New Owner"
            placeholder="Search users…"
            action="list_users"
            value={toUserId}
            onChange={(id, item) => { setToUserId(id); setToUserLabel(item?.name || ""); }}
          />
        </div>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm space-y-2">
          <p className="font-medium text-amber-600 dark:text-amber-400">Ownership Transfer Agreement</p>
          <p className="text-muted-foreground">
            By transferring ownership, you acknowledge that the recipient will become the sole owner of this team.
            You will no longer have access to their team data, and you may not log into their account or access their
            information without their written consent, in accordance with Rollout's{" "}
            <a href="/privacy" className="underline" target="_blank" rel="noreferrer">Privacy Policy</a>.
          </p>
          <p className="text-muted-foreground">
            The new owner will be notified via <strong>email</strong> and an <strong>in-app notification</strong> asking them to accept ownership.
          </p>
          <label className="flex items-center gap-2 cursor-pointer mt-2">
            <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} className="rounded" />
            <span className="text-sm">I acknowledge and agree to these terms</span>
          </label>
        </div>
        <Button onClick={submit} disabled={busy || !teamId || !toUserId || !acknowledged}>{busy ? "Initiating…" : "Initiate Transfer"}</Button>
      </CardContent>
    </Card>
  );
}

/* ─── Support Access ─── */
function SupportAccessSection() {
  const [teamId, setTeamId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  const loadSessions = async () => {
    const { data } = await supabase
      .from("support_access_requests")
      .select("*, teams(name)")
      .in("status", ["pending", "active"])
      .order("created_at", { ascending: false });
    setActiveSessions(data || []);
  };

  useEffect(() => { loadSessions(); }, []);

  const requestAccess = async () => {
    setBusy(true);
    try {
      await adminAction("request_support_access", { team_id: teamId, reason });
      toast.success("Support access request sent to team owner");
      setTeamId(""); setReason("");
      loadSessions();
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };

  const endSession = async (requestId: string) => {
    try {
      await adminAction("end_support_session", { request_id: requestId });
      toast.success("Support session ended");
      loadSessions();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Headset className="h-5 w-5" /> Support Access</CardTitle>
        <CardDescription>Request temporary access to a team for troubleshooting. Requires team owner approval.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SearchableCombobox
              label="Team"
              placeholder="Search teams…"
              action="list_teams"
              value={teamId}
              onChange={(id) => setTeamId(id)}
            />
            <div><Label>Reason (optional)</Label><Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Describe the issue…" rows={1} /></div>
          </div>
          <Button onClick={requestAccess} disabled={busy || !teamId}>{busy ? "Requesting…" : "Request Support Access"}</Button>
        </div>

        {activeSessions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Active & Pending Sessions</h3>
            {activeSessions.map(s => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{(s as any).teams?.name || "Unknown team"}</p>
                  {s.reason && <p className="text-xs text-muted-foreground">{s.reason}</p>}
                  <div className="flex items-center gap-2">
                    <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-xs">
                      {s.status}
                    </Badge>
                    {s.expires_at && (
                      <span className="text-xs text-muted-foreground">
                        Expires: {new Date(s.expires_at).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
                {s.status === "active" && (
                  <Button variant="outline" size="sm" onClick={() => endSession(s.id)}>
                    <LogOut className="h-3.5 w-3.5 mr-1" /> End Session
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
