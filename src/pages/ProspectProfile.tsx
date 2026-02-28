import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, ExternalLink, User, Music, Phone, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { InlineField } from "@/components/ui/InlineField";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { DealTermsCard } from "@/components/ar/DealTermsCard";

const STAGES = [
  "discovered", "contacted", "in_conversation", "materials_requested",
  "internal_review", "offer_sent", "negotiating", "signed", "passed", "on_hold",
];
const PRIORITIES = ["low", "medium", "high"];
const ENGAGEMENT_TYPES = ["call", "email", "dm", "meeting", "show", "intro", "deal_sent"];
const DEAL_STATUSES = ["not_discussed", "discussing", "offer_sent", "under_negotiation", "signed", "passed"];
const DEAL_TYPES = ["distribution", "frontline_record", "partnership", "publishing"];

const stageLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function ProspectProfile() {
  const { prospectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: prospect, isLoading } = useProspect(prospectId);
  const updateProspect = useUpdateProspect();
  const { data: engagements = [] } = useProspectEngagements(prospectId);
  const createEngagement = useCreateEngagement();
  const { data: contacts = [] } = useProspectContacts(prospectId);
  const createContact = useCreateProspectContact();
  const { data: deal } = useProspectDeal(prospectId);
  const upsertDeal = useUpsertDeal();

  const [showEngagementForm, setShowEngagementForm] = useState(false);
  const [engForm, setEngForm] = useState({ engagement_type: "call", outcome: "", next_step: "", engagement_date: new Date().toISOString().split("T")[0] });
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", role: "", email: "", phone: "" });

  if (isLoading) return <AppLayout title="A&R"><div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div></AppLayout>;
  if (!prospect) return <AppLayout title="A&R"><div className="text-center py-12 text-muted-foreground">Prospect not found.</div></AppLayout>;

  const handleFieldUpdate = async (field: string, value: any) => {
    try {
      await updateProspect.mutateAsync({ id: prospect.id, [field]: value });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddEngagement = async () => {
    if (!engForm.engagement_type) return;
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
    if (!contactForm.name.trim()) return;
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
    <AppLayout title="A&R">
      <button onClick={() => navigate("/ar")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Pipeline
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-foreground text-2xl font-bold">{prospect.artist_name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {prospect.primary_genre && <Badge variant="secondary">{prospect.primary_genre}</Badge>}
            {prospect.city && <span className="text-sm text-muted-foreground">{prospect.city}</span>}
            {prospect.monthly_listeners && (
              <span className="text-sm text-muted-foreground">
                {prospect.monthly_listeners.toLocaleString()} monthly listeners
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={prospect.stage} onValueChange={(v) => handleFieldUpdate("stage", v)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => <SelectItem key={s} value={s}>{stageLabel(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={prospect.priority} onValueChange={(v) => handleFieldUpdate("priority", v)}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{stageLabel(p)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Info + Contacts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Info - inline editing like artist info tab */}
          <CollapsibleSection title="Profile" defaultOpen>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Music className="h-3.5 w-3.5" /> Artist Info
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Genre" value={prospect.primary_genre ?? ""} placeholder="e.g. Hip Hop" onSave={(v) => handleFieldUpdate("primary_genre", v || null)} />
                <Field label="City" value={prospect.city ?? ""} placeholder="e.g. Atlanta" onSave={(v) => handleFieldUpdate("city", v || null)} />
                <Field label="Monthly Listeners" value={prospect.monthly_listeners?.toString() ?? ""} placeholder="e.g. 50000" onSave={(v) => handleFieldUpdate("monthly_listeners", v ? parseInt(v) : null)} />
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
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> Socials & Links
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            </div>

            <div className="mt-4">
              <span className="text-muted-foreground text-xs">Key Songs</span>
              <InlineField
                value={(prospect.key_songs || []).join(", ")}
                placeholder="Song 1, Song 2, Song 3"
                onSave={(v) => handleFieldUpdate("key_songs", v.split(",").map((s: string) => s.trim()).filter(Boolean))}
              />
            </div>

            <div className="mt-3">
              <span className="text-muted-foreground text-xs">Notes</span>
              <InlineField
                value={prospect.notes ?? ""}
                placeholder="General notes..."
                onSave={(v) => handleFieldUpdate("notes", v || null)}
                as="textarea"
              />
            </div>
          </CollapsibleSection>

          {/* Team Contacts */}
          <CollapsibleSection title="Team Contacts" defaultOpen>
            <div className="space-y-2">
              {contacts.map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
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
                      <Input value={contactForm.name} onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))} placeholder="Contact name" className="h-9 mt-0.5 bg-transparent border-border" />
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Role</span>
                      <Input value={contactForm.role} onChange={(e) => setContactForm((p) => ({ ...p, role: e.target.value }))} placeholder="Manager, Lawyer..." className="h-9 mt-0.5 bg-transparent border-border" />
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Email</span>
                      <Input value={contactForm.email} onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))} placeholder="email@example.com" className="h-9 mt-0.5 bg-transparent border-border" />
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Phone</span>
                      <Input value={contactForm.phone} onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 555 555 5555" className="h-9 mt-0.5 bg-transparent border-border" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddContact} disabled={!contactForm.name.trim()}>Add</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowContactForm(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowContactForm(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add Contact
                </Button>
              )}
            </div>
          </CollapsibleSection>

          {/* Deal Summary */}
          <CollapsibleSection title="Deal Summary" defaultOpen>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <SelectField label="Deal Status" value={deal?.deal_status || "not_discussed"} options={DEAL_STATUSES} placeholder="Select status" onSave={(v) => handleDealChange("deal_status", v)} />
              <SelectField label="Deal Type" value={deal?.deal_type || ""} options={DEAL_TYPES} placeholder="Select type..." onSave={(v) => handleDealChange("deal_type", v)} />
            </div>

            {deal?.deal_type && (
              <DealTermsCard deal={deal} onUpdate={handleDealChange} />
            )}
          </CollapsibleSection>
        </div>

        {/* Right column: Engagements */}
        <div>
          <CollapsibleSection title="Engagement Log" defaultOpen>
            <div className="space-y-3">
              {showEngagementForm ? (
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <SelectField label="Type" value={engForm.engagement_type} options={ENGAGEMENT_TYPES} placeholder="Select type" onSave={(v) => setEngForm((p) => ({ ...p, engagement_type: v }))} />
                    <div>
                      <span className="text-muted-foreground text-xs">Date</span>
                      <Input type="date" value={engForm.engagement_date} onChange={(e) => setEngForm((p) => ({ ...p, engagement_date: e.target.value }))} className="h-9 mt-0.5 bg-transparent border-border" />
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
                    <Input value={engForm.next_step} onChange={(e) => setEngForm((p) => ({ ...p, next_step: e.target.value }))} placeholder="What's next?" className="h-9 mt-0.5 bg-transparent border-border" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddEngagement}>Log</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowEngagementForm(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => setShowEngagementForm(true)}>
                  <Plus className="h-3.5 w-3.5" /> Log Engagement
                </Button>
              )}

              {/* Timeline */}
              <div className="relative">
                {engagements.map((eng: any, i: number) => (
                  <div key={eng.id} className="flex gap-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 mt-1.5" />
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
                  <div className="text-xs text-muted-foreground text-center py-4">No engagements yet.</div>
                )}
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </AppLayout>
  );
}

/* ── Reusable inline field with label (matches artist info pattern) ── */
function Field({
  label, value, placeholder, onSave, as,
}: {
  label: string; value: string; placeholder: string; onSave: (v: string) => void; as?: "input" | "textarea";
}) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <InlineField value={value} placeholder={placeholder} onSave={onSave} as={as} />
    </div>
  );
}

/* ── Select dropdown field (matches artist info pattern) ── */
function SelectField({
  label, value, options, placeholder, onSave,
}: {
  label: string; value: string; options: string[]; placeholder: string; onSave: (v: string) => void;
}) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <Select value={value} onValueChange={onSave}>
        <SelectTrigger className="w-full bg-transparent border border-border rounded-md text-foreground h-9 mt-0.5">
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
