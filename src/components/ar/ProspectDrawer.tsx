import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { InlineField } from "@/components/ui/InlineField";
import { DealTermsCard } from "@/components/ar/DealTermsCard";
import {
  Plus,
  ExternalLink,
  User,
  Music,
  RefreshCw,
  Headphones,
  MapPin,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  useProspect,
  useUpdateProspect,
  useProspectEngagements,
  useCreateEngagement,
  useProspectContacts,
  useCreateProspectContact,
  useProspectDeal,
  useUpsertDeal,
} from "@/hooks/useProspects";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const STAGES = [
  "contacted", "internal_review", "offer_sent", "negotiating", "signed", "passed",
];
const PRIORITIES = ["low", "medium", "high"];
const ENGAGEMENT_TYPES = [
  "call", "email", "dm", "meeting", "show", "intro", "deal_sent",
  "discovered", "in_conversation", "materials_requested", "on_hold",
];
const DEAL_STATUSES = ["not_discussed", "discussing", "offer_sent", "under_negotiation", "signed", "passed"];
const DEAL_TYPES = ["distribution", "frontline_record", "partnership", "publishing"];

const stageLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const priorityDot = (p: string) => {
  if (p === "high") return "bg-destructive";
  if (p === "medium") return "bg-amber-500";
  return "bg-muted-foreground/40";
};

interface ProspectDrawerProps {
  prospectId: string | null;
  onClose: () => void;
}

export function ProspectDrawer({ prospectId, onClose }: ProspectDrawerProps) {
  const { user } = useAuth();
  const { data: prospect, isLoading } = useProspect(prospectId ?? undefined);
  const updateProspect = useUpdateProspect();
  const { data: engagements = [] } = useProspectEngagements(prospectId ?? undefined);
  const createEngagement = useCreateEngagement();
  const { data: contacts = [] } = useProspectContacts(prospectId ?? undefined);
  const createContact = useCreateProspectContact();
  const { data: deal } = useProspectDeal(prospectId ?? undefined);
  const upsertDeal = useUpsertDeal();

  const [showEngagementForm, setShowEngagementForm] = useState(false);
  const [engForm, setEngForm] = useState({ engagement_type: "call", outcome: "", next_step: "", engagement_date: new Date().toISOString().split("T")[0] });
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", role: "", email: "", phone: "" });
  const [syncingSpotify, setSyncingSpotify] = useState(false);

  // Reset forms when prospect changes
  useEffect(() => {
    setShowEngagementForm(false);
    setShowContactForm(false);
  }, [prospectId]);

  const spotifyId = prospect?.spotify_uri?.match(/spotify:artist:(\w+)/)?.[1]
    || prospect?.spotify_uri?.match(/artist\/(\w+)/)?.[1]
    || null;

  useEffect(() => {
    if (!prospect || !spotifyId) return;
    if (prospect.monthly_listeners && prospect.monthly_listeners > 0) return;
    syncSpotifyData();
  }, [prospect?.id, spotifyId]);

  const syncSpotifyData = async () => {
    if (!spotifyId || !prospect) return;
    setSyncingSpotify(true);
    try {
      const { data, error } = await supabase.functions.invoke("spotify-artist", {
        body: { spotify_id: spotifyId },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      const updates: Record<string, any> = {};
      if (data.monthly_listeners && data.monthly_listeners > 0) updates.monthly_listeners = data.monthly_listeners;
      if (data.genres?.length > 0 && !prospect.primary_genre) updates.primary_genre = data.genres[0];
      if (data.images?.[0]?.url) updates.avatar_url = data.images[0].url;
      if (Object.keys(updates).length > 0) {
        await updateProspect.mutateAsync({ id: prospect.id, ...updates });
      }
    } catch (err) {
      console.error("Spotify sync error:", err);
    } finally {
      setSyncingSpotify(false);
    }
  };

  const handleFieldUpdate = async (field: string, value: any) => {
    if (!prospect) return;
    try {
      await updateProspect.mutateAsync({ id: prospect.id, [field]: value });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddEngagement = async () => {
    if (!prospect || !engForm.engagement_type) return;
    try {
      await createEngagement.mutateAsync({
        prospect_id: prospect.id,
        engagement_type: engForm.engagement_type,
        engagement_date: engForm.engagement_date,
        outcome: engForm.outcome || undefined,
        next_step: engForm.next_step || undefined,
        owner_id: user?.id,
      });
      toast.success("Engagement logged!");
      setShowEngagementForm(false);
      setEngForm({ engagement_type: "call", outcome: "", next_step: "", engagement_date: new Date().toISOString().split("T")[0] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddContact = async () => {
    if (!prospect || !contactForm.name.trim()) return;
    try {
      await createContact.mutateAsync({
        prospect_id: prospect.id,
        name: contactForm.name.trim(),
        role: contactForm.role || undefined,
        email: contactForm.email || undefined,
        phone: contactForm.phone || undefined,
      });
      toast.success("Contact added!");
      setShowContactForm(false);
      setContactForm({ name: "", role: "", email: "", phone: "" });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDealChange = async (field: string, value: any) => {
    if (!prospect) return;
    try {
      await upsertDeal.mutateAsync({
        id: deal?.id,
        prospect_id: prospect.id,
        [field]: value,
      });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Sheet open={!!prospectId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col overflow-hidden">
        {isLoading || !prospect ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {isLoading ? "Loading..." : "Prospect not found."}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 border border-border">
                  {prospect.avatar_url && <AvatarImage src={prospect.avatar_url} alt={prospect.artist_name} />}
                  <AvatarFallback className="text-sm font-bold">{prospect.artist_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-foreground truncate">{prospect.artist_name}</h2>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {prospect.primary_genre && <Badge variant="secondary" className="text-[10px]">{prospect.primary_genre}</Badge>}
                    {prospect.city && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />{prospect.city}
                      </span>
                    )}
                    {prospect.monthly_listeners && prospect.monthly_listeners > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Headphones className="h-3 w-3" />{prospect.monthly_listeners.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Select value={prospect.stage} onValueChange={(v) => handleFieldUpdate("stage", v)}>
                  <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => <SelectItem key={s} value={s}>{stageLabel(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={prospect.priority} onValueChange={(v) => handleFieldUpdate("priority", v)}>
                  <SelectTrigger className="h-8 text-xs w-24">
                    <div className="flex items-center gap-1.5">
                      <div className={cn("h-2 w-2 rounded-full shrink-0", priorityDot(prospect.priority))} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{stageLabel(p)}</SelectItem>)}
                  </SelectContent>
                </Select>
                {spotifyId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={syncSpotifyData}
                    disabled={syncingSpotify}
                    title="Refresh from Spotify"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", syncingSpotify && "animate-spin")} />
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-5 mt-3 mb-0 w-auto justify-start bg-transparent gap-1 h-auto p-0 border-b border-border rounded-none">
                <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 pb-2 text-xs">Details</TabsTrigger>
                <TabsTrigger value="engagement" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 pb-2 text-xs">Engagement</TabsTrigger>
                <TabsTrigger value="deal" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 pb-2 text-xs">Deal</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                {/* Details Tab */}
                <TabsContent value="details" className="px-5 py-4 space-y-5 mt-0">
                  {/* Artist Info */}
                  <section>
                    <h4 className="overline mb-2 flex items-center gap-1.5">
                      <Music className="h-3.5 w-3.5" /> Artist Info
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Genre" value={prospect.primary_genre ?? ""} placeholder="Auto-filled from Spotify" onSave={(v) => handleFieldUpdate("primary_genre", v || null)} />
                      <Field label="City" value={prospect.city ?? ""} placeholder="e.g. Atlanta" onSave={(v) => handleFieldUpdate("city", v || null)} />
                      <div>
                        <span className="text-muted-foreground text-xs">Monthly Listeners</span>
                        <div className="text-sm font-medium py-1.5 px-2">
                          {syncingSpotify ? (
                            <span className="text-muted-foreground">Fetching...</span>
                          ) : prospect.monthly_listeners ? (
                            prospect.monthly_listeners.toLocaleString()
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Next Follow Up</span>
                        <Input
                          type="date"
                          defaultValue={prospect.next_follow_up || ""}
                          onBlur={(e) => handleFieldUpdate("next_follow_up", e.target.value || null)}
                          className="h-9 mt-0.5 bg-transparent border-border"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Socials */}
                  <section>
                    <h4 className="overline mb-2 flex items-center gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" /> Socials & Links
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-muted-foreground text-xs">Spotify URI</span>
                        <div className="flex items-center gap-1">
                          <InlineField
                            value={prospect.spotify_uri ?? ""}
                            placeholder="spotify:artist:... or URL"
                            onSave={(v) => handleFieldUpdate("spotify_uri", v || null)}
                          />
                          {prospect.spotify_uri && (
                            <a
                              href={prospect.spotify_uri.startsWith("http") ? prospect.spotify_uri : `https://open.spotify.com/artist/${prospect.spotify_uri.replace("spotify:artist:", "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0"
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </a>
                          )}
                        </div>
                      </div>
                      <Field label="Instagram" value={prospect.instagram ?? ""} placeholder="@handle" onSave={(v) => handleFieldUpdate("instagram", v || null)} />
                      <Field label="TikTok" value={prospect.tiktok ?? ""} placeholder="@handle" onSave={(v) => handleFieldUpdate("tiktok", v || null)} />
                      <Field label="YouTube" value={prospect.youtube ?? ""} placeholder="Channel URL" onSave={(v) => handleFieldUpdate("youtube", v || null)} />
                    </div>
                  </section>

                  {/* Key Songs */}
                  <section>
                    <span className="text-muted-foreground text-xs">Key Songs</span>
                    <InlineField
                      value={(prospect.key_songs || []).join(", ")}
                      placeholder="Song 1, Song 2, Song 3"
                      onSave={(v) => handleFieldUpdate("key_songs", v.split(",").map((s: string) => s.trim()).filter(Boolean))}
                    />
                  </section>

                  {/* Notes */}
                  <section>
                    <span className="text-muted-foreground text-xs">Notes</span>
                    <InlineField
                      value={prospect.notes ?? ""}
                      placeholder="General notes..."
                      onSave={(v) => handleFieldUpdate("notes", v || null)}
                      as="textarea"
                    />
                  </section>

                  {/* Team Contacts */}
                  <section>
                    <h4 className="overline mb-2 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" /> Team Contacts
                    </h4>
                    <div className="space-y-2">
                      {contacts.map((c: any) => (
                        <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{c.name}</div>
                            <div className="text-xs text-muted-foreground">{[c.role, c.email, c.phone].filter(Boolean).join(" · ")}</div>
                          </div>
                        </div>
                      ))}
                      {showContactForm ? (
                        <div className="rounded-lg border border-border p-3 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-muted-foreground text-xs">Name</span>
                              <Input value={contactForm.name} onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))} placeholder="Contact name" className="h-8 mt-0.5 bg-transparent border-border text-sm" />
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Role</span>
                              <Input value={contactForm.role} onChange={(e) => setContactForm((p) => ({ ...p, role: e.target.value }))} placeholder="Manager, Lawyer..." className="h-8 mt-0.5 bg-transparent border-border text-sm" />
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Email</span>
                              <Input value={contactForm.email} onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))} placeholder="email@example.com" className="h-8 mt-0.5 bg-transparent border-border text-sm" />
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Phone</span>
                              <Input value={contactForm.phone} onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 555 555 5555" className="h-8 mt-0.5 bg-transparent border-border text-sm" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleAddContact} disabled={!contactForm.name.trim()}>Add</Button>
                            <Button size="sm" variant="outline" onClick={() => setShowContactForm(false)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowContactForm(true)}>
                          <Plus className="h-3.5 w-3.5" /> Add Contact
                        </Button>
                      )}
                    </div>
                  </section>
                </TabsContent>

                {/* Engagement Tab */}
                <TabsContent value="engagement" className="px-5 py-4 space-y-4 mt-0">
                  {showEngagementForm ? (
                    <div className="rounded-lg border border-border p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <SelectField label="Type" value={engForm.engagement_type} options={ENGAGEMENT_TYPES} placeholder="Select type" onSave={(v) => setEngForm((p) => ({ ...p, engagement_type: v }))} />
                        <div>
                          <span className="text-muted-foreground text-xs">Date</span>
                          <Input type="date" value={engForm.engagement_date} onChange={(e) => setEngForm((p) => ({ ...p, engagement_date: e.target.value }))} className="h-8 mt-0.5 bg-transparent border-border text-sm" />
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Outcome / Notes</span>
                        <RichTextEditor
                          value={engForm.outcome}
                          onChange={(v) => setEngForm((p) => ({ ...p, outcome: v }))}
                          placeholder="What happened?"
                        />
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Next Step</span>
                        <Input value={engForm.next_step} onChange={(e) => setEngForm((p) => ({ ...p, next_step: e.target.value }))} placeholder="What's next?" className="h-8 mt-0.5 bg-transparent border-border text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddEngagement}>Log</Button>
                        <Button size="sm" variant="outline" onClick={() => setShowEngagementForm(false)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full gap-1 text-xs" onClick={() => setShowEngagementForm(true)}>
                      <Plus className="h-3.5 w-3.5" /> Log Engagement
                    </Button>
                  )}

                  {/* Timeline */}
                  <div className="relative">
                    {engagements.map((eng: any, i: number) => (
                      <div key={eng.id} className="flex gap-3 pb-4">
                        <div className="flex flex-col items-center">
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          {i < engagements.length - 1 && <div className="w-px flex-1 bg-border" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">{stageLabel(eng.engagement_type)}</Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(eng.engagement_date).toLocaleDateString()}
                            </span>
                          </div>
                          {eng.outcome && <p className="text-xs mt-1 text-foreground">{eng.outcome}</p>}
                          {eng.next_step && <p className="text-xs text-muted-foreground mt-0.5">Next: {eng.next_step}</p>}
                        </div>
                      </div>
                    ))}
                    {engagements.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-6">No engagements yet.</div>
                    )}
                  </div>
                </TabsContent>

                {/* Deal Tab */}
                <TabsContent value="deal" className="px-5 py-4 space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-3">
                    <SelectField label="Deal Status" value={deal?.deal_status || "not_discussed"} options={DEAL_STATUSES} placeholder="Select status" onSave={(v) => handleDealChange("deal_status", v)} />
                    <SelectField label="Deal Type" value={deal?.deal_type || ""} options={DEAL_TYPES} placeholder="Select type..." onSave={(v) => handleDealChange("deal_type", v)} />
                  </div>
                  {deal?.deal_type && (
                    <DealTermsCard deal={deal} onUpdate={handleDealChange} />
                  )}
                  {!deal?.deal_type && (
                    <div className="text-xs text-muted-foreground text-center py-6">
                      Select a deal type to configure terms.
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ── Reusable inline field with label ── */
function Field({
  label, value, placeholder, onSave,
}: {
  label: string; value: string; placeholder: string; onSave: (v: string) => void;
}) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <InlineField value={value} placeholder={placeholder} onSave={onSave} />
    </div>
  );
}

/* ── Select dropdown field ── */
function SelectField({
  label, value, options, placeholder, onSave,
}: {
  label: string; value: string; options: string[]; placeholder: string; onSave: (v: string) => void;
}) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <Select value={value} onValueChange={onSave}>
        <SelectTrigger className="w-full bg-transparent border border-border rounded-md text-foreground h-8 mt-0.5 text-sm">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-popover border border-border z-50">
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>{stageLabel(opt)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
