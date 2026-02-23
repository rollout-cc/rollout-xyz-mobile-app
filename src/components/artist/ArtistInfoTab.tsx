import { useState, useEffect, useRef } from "react";
import { format, parse } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronRight, User, Plane, Shirt, CalendarIcon, Share2, Check, Copy, Music } from "lucide-react";
import { toast } from "sonner";
import { InlineField } from "@/components/ui/InlineField";
import { cn } from "@/lib/utils";

interface ArtistInfoTabProps {
  artist: any;
}

export function ArtistInfoTab({ artist }: ArtistInfoTabProps) {
  return (
    <div className="space-y-6 mt-4">
      <MembersSection artistId={artist.id} />
    </div>
  );
}

/* ── Goals (top-level artist fields) ── */
function GoalsSection({ artist }: { artist: any }) {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: async (patch: Record<string, string>) => {
      const { error } = await supabase.from("artists").update(patch).eq("id", artist.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist", artist.id] }),
    onError: (e: any) => toast.error(e.message),
  });

  const fields = [
    { key: "primary_goal", label: "Primary Goal" },
    { key: "secondary_goal", label: "Secondary Goal" },
    { key: "primary_focus", label: "Primary Focus" },
    { key: "secondary_focus", label: "Secondary Focus" },
  ];

  return (
    <section>
      <h3 className="font-semibold flex items-center gap-2 mb-3"><User className="h-4 w-4" /> Goals & Focus</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {fields.map(({ key, label }) => (
          <div key={key}>
            <span className="text-muted-foreground text-xs">{label}</span>
            <InlineField
              value={artist[key] ?? ""}
              placeholder={`Enter ${label.toLowerCase()}`}
              onSave={(v) => save.mutate({ [key]: v })}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Members Section (unified cards) ── */
function MembersSection({ artistId }: { artistId: string }) {
  const queryClient = useQueryClient();
  const autoCreatedRef = useRef(false);

  const { data: members = [], isSuccess } = useQuery({
    queryKey: ["artist_travel_info", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_travel_info")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const addMember = useMutation({
    mutationFn: async (nameOverride?: { first_name?: string; last_name?: string }) => {
      const { error } = await supabase
        .from("artist_travel_info")
        .insert({ artist_id: artistId, ...(nameOverride || {}) } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist_travel_info", artistId] }),
    onError: (e: any) => toast.error(e.message),
  });

  // Auto-create a blank member for new artists
  useEffect(() => {
    if (isSuccess && members.length === 0 && !autoCreatedRef.current && !addMember.isPending) {
      autoCreatedRef.current = true;
      addMember.mutate({});
    }
  }, [isSuccess, members.length]);

  const updateMember = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const { error } = await supabase.from("artist_travel_info").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist_travel_info", artistId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("artist_travel_info").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist_travel_info", artistId] }),
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Band Members</h3>
        <Button variant="ghost" size="sm" onClick={() => addMember.mutate({})}>
          <Plus className="h-4 w-4 mr-1" /> Add Member
        </Button>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members yet. Click Add Member to create one.</p>
      ) : (
        <div className="space-y-3">
          {members.map((m: any) => (
            <MemberCard
              key={m.id}
              member={m}
              onUpdate={(patch) => updateMember.mutate({ id: m.id, patch })}
              onDelete={() => deleteMember.mutate(m.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Single Member Card ── */
function MemberCard({
  member,
  onUpdate,
  onDelete,
}: {
  member: any;
  onUpdate: (patch: Record<string, any>) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  const firstName = member.first_name || member.member_name || "";
  const lastName = member.last_name || "";
  const displayName = `${firstName} ${lastName}`.trim() || "Unnamed Member";

  return (
    <div className="rounded-lg border border-border bg-card text-sm group">
      {/* Header – always visible */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full p-3 text-left"
      >
        <div className="flex items-center gap-2 font-medium">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <User className="h-4 w-4 text-muted-foreground" />
          {displayName}
        </div>
        <div className="flex items-center gap-1">
          <ShareButton member={member} onUpdate={onUpdate} />
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 h-7 w-7"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </button>

      {/* Collapsible content */}
      {open && (
        <div className="px-4 pb-4 space-y-5">
          {/* Personal Info */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Personal Info
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="First Name" value={member.first_name ?? ""} placeholder="Enter first name" onSave={(v) => onUpdate({ first_name: v })} />
              <Field label="Last Name" value={member.last_name ?? ""} placeholder="Enter last name" onSave={(v) => onUpdate({ last_name: v })} />
              <DateField label="Date of Birth" value={member.date_of_birth ?? ""} onSave={(v) => onUpdate({ date_of_birth: v || null })} />
            </div>
          </div>

          {/* Travel Info */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Plane className="h-3.5 w-3.5" /> Travel Info
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="KTN Number" value={member.ktn_number ?? ""} placeholder="Enter KTN number" onSave={(v) => onUpdate({ ktn_number: v })} />
              <Field label="Driver's License #" value={(member as any).drivers_license ?? ""} placeholder="Enter license number" onSave={(v) => onUpdate({ drivers_license: v })} />
              <SelectField label="Preferred Seat" value={member.preferred_seat ?? ""} options={["Window", "Middle", "Aisle"]} placeholder="Select seat" onSave={(v) => onUpdate({ preferred_seat: v })} />
              <Field label="Preferred Airline" value={member.preferred_airline ?? ""} placeholder="e.g. Delta, United" onSave={(v) => onUpdate({ preferred_airline: v })} />
              <Field label="Passport Name" value={member.passport_name ?? ""} placeholder="Enter passport name" onSave={(v) => onUpdate({ passport_name: v })} />
              <Field label="Dietary Restrictions" value={member.dietary_restrictions ?? ""} placeholder="Enter dietary restrictions" onSave={(v) => onUpdate({ dietary_restrictions: v })} />
              <div className="sm:col-span-2">
                <Field label="Notes" value={member.notes ?? ""} placeholder="Enter travel notes" onSave={(v) => onUpdate({ notes: v })} as="textarea" />
              </div>
            </div>
          </div>

          {/* Admin Info */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Music className="h-3.5 w-3.5" /> Admin Info
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="PRO (Performing Rights Org)" value={(member as any).pro_name ?? ""} placeholder="e.g. ASCAP, BMI, SESAC" onSave={(v) => onUpdate({ pro_name: v })} />
              <Field label="IPI/CAE #" value={(member as any).ipi_number ?? ""} placeholder="Enter IPI/CAE number" onSave={(v) => onUpdate({ ipi_number: v })} />
              <Field label="Publisher" value={(member as any).publisher_name ?? ""} placeholder="Enter publishing company" onSave={(v) => onUpdate({ publisher_name: v })} />
              <Field label="Publishing Admin" value={(member as any).publishing_admin ?? ""} placeholder="Enter publishing admin" onSave={(v) => onUpdate({ publishing_admin: v })} />
              <Field label="Publisher PRO" value={(member as any).publisher_pro ?? ""} placeholder="e.g. ASCAP, BMI" onSave={(v) => onUpdate({ publisher_pro: v })} />
              <Field label="ISNI" value={(member as any).isni ?? ""} placeholder="Enter ISNI" onSave={(v) => onUpdate({ isni: v })} />
              <Field label="Spotify URI" value={(member as any).spotify_uri ?? ""} placeholder="e.g. spotify:artist:..." onSave={(v) => onUpdate({ spotify_uri: v })} />
              <Field label="Record Label" value={(member as any).record_label ?? ""} placeholder="Enter record label" onSave={(v) => onUpdate({ record_label: v })} />
              <Field label="Distributor" value={(member as any).distributor ?? ""} placeholder="Enter distributor" onSave={(v) => onUpdate({ distributor: v })} />
            </div>
          </div>

          {/* Clothing */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Shirt className="h-3.5 w-3.5" /> Clothing
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <SelectField label="Shirt Size" value={member.shirt_size ?? ""} options={["XS", "S", "M", "L", "XL", "XXL", "XXXL"]} placeholder="Select size" onSave={(v) => onUpdate({ shirt_size: v })} />
              <Field label="Pants Size" value={member.pant_size ?? ""} placeholder="e.g. 32x30" onSave={(v) => onUpdate({ pant_size: v })} />
              <SelectField label="Shoe Size" value={member.shoe_size ?? ""} options={["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "13", "14"]} placeholder="Select size" onSave={(v) => onUpdate({ shoe_size: v })} />
              <SelectField label="Dress Size" value={member.dress_size ?? ""} options={["XS", "S", "M", "L", "XL", "0", "2", "4", "6", "8", "10", "12", "14", "16"]} placeholder="Select size" onSave={(v) => onUpdate({ dress_size: v })} />
              <SelectField label="Hat Size" value={member.hat_size ?? ""} options={["S", "M", "L", "XL", "6 7/8", "7", "7 1/8", "7 1/4", "7 3/8", "7 1/2", "7 5/8", "7 3/4"]} placeholder="Select size" onSave={(v) => onUpdate({ hat_size: v })} />
              <div className="col-span-2 sm:col-span-3">
                <Field label="Favorite Clothing Brands" value={member.favorite_brands ?? ""} placeholder="Enter favorite brands" onSave={(v) => onUpdate({ favorite_brands: v })} />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setOpen(false);
                toast.success("Saved");
              }}
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Share button ── */
function ShareButton({ member, onUpdate }: { member: any; onUpdate: (patch: Record<string, any>) => void }) {
  const [copied, setCopied] = useState(false);
  const isPublic = member.is_public ?? false;
  const token = member.public_token;

  const toggleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPublic) {
      onUpdate({ is_public: false });
      toast.success("Sharing disabled");
    } else {
      onUpdate({ is_public: true });
      const url = `${window.location.origin}/shared/member/${token}`;
      navigator.clipboard.writeText(url);
      toast.success("Link copied! Sharing enabled.");
    }
  };

  const copyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/shared/member/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-0.5">
      {isPublic && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyLink}>
          {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-7 w-7", isPublic ? "text-primary" : "opacity-0 group-hover:opacity-100")}
        onClick={toggleShare}
        title={isPublic ? "Disable sharing" : "Share this member's info"}
      >
        <Share2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/* ── Reusable labeled field ── */
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
        <SelectTrigger className="w-full bg-transparent border border-border rounded-md text-foreground h-9 mt-0.5">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-popover border border-border z-50">
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ── Date picker field with year/month dropdowns ── */
function DateField({
  label, value, onSave,
}: {
  label: string; value: string; onSave: (v: string) => void;
}) {
  const date = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1940 + 1 }, (_, i) => currentYear - i);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const [viewMonth, setViewMonth] = useState<Date>(date ?? new Date(2000, 0));

  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-9 mt-0.5 bg-transparent border-border",
              !date && "text-muted-foreground/50"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : "Select date of birth"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-popover border border-border z-50" align="start">
          <div className="flex gap-2 px-3 pt-3">
            <Select
              value={String(viewMonth.getFullYear())}
              onValueChange={(y) => setViewMonth(new Date(Number(y), viewMonth.getMonth()))}
            >
              <SelectTrigger className="h-8 text-xs flex-1 bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-[60] max-h-60">
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(viewMonth.getMonth())}
              onValueChange={(m) => setViewMonth(new Date(viewMonth.getFullYear(), Number(m)))}
            >
              <SelectTrigger className="h-8 text-xs flex-1 bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-[60]">
                {months.map((m, i) => (
                  <SelectItem key={m} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Calendar
            mode="single"
            selected={date}
            month={viewMonth}
            onMonthChange={setViewMonth}
            onSelect={(d) => d && onSave(format(d, "yyyy-MM-dd"))}
            disabled={(d) => d > new Date()}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
