import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronDown, ChevronRight, User, Plane, Shirt } from "lucide-react";
import { toast } from "sonner";
import { InlineField } from "@/components/ui/InlineField";

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

  const { data: members = [] } = useQuery({
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
    mutationFn: async () => {
      const { error } = await supabase
        .from("artist_travel_info")
        .insert({ artist_id: artistId, first_name: "New", last_name: "Member" } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist_travel_info", artistId] }),
    onError: (e: any) => toast.error(e.message),
  });

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
        <Button variant="ghost" size="sm" onClick={() => addMember.mutate()}>
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
  const [open, setOpen] = useState(true);

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
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
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
              <Field label="Date of Birth" value={member.date_of_birth ?? ""} placeholder="YYYY-MM-DD" onSave={(v) => onUpdate({ date_of_birth: v || null })} />
            </div>
          </div>

          {/* Travel Info */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Plane className="h-3.5 w-3.5" /> Travel Info
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="KTN Number" value={member.ktn_number ?? ""} placeholder="Enter KTN number" onSave={(v) => onUpdate({ ktn_number: v })} />
              <Field label="TSA PreCheck Number" value={member.tsa_precheck_number ?? ""} placeholder="Enter TSA PreCheck number" onSave={(v) => onUpdate({ tsa_precheck_number: v })} />
              <Field label="Preferred Seat" value={member.preferred_seat ?? ""} placeholder="e.g. Window, Aisle" onSave={(v) => onUpdate({ preferred_seat: v })} />
              <Field label="Preferred Airline" value={member.preferred_airline ?? ""} placeholder="e.g. Delta, United" onSave={(v) => onUpdate({ preferred_airline: v })} />
              <Field label="Passport Name" value={member.passport_name ?? ""} placeholder="Enter passport name" onSave={(v) => onUpdate({ passport_name: v })} />
              <Field label="Dietary Restrictions" value={member.dietary_restrictions ?? ""} placeholder="Enter dietary restrictions" onSave={(v) => onUpdate({ dietary_restrictions: v })} />
              <div className="sm:col-span-2">
                <Field label="Notes" value={member.notes ?? ""} placeholder="Enter travel notes" onSave={(v) => onUpdate({ notes: v })} as="textarea" />
              </div>
            </div>
          </div>

          {/* Clothing */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Shirt className="h-3.5 w-3.5" /> Clothing
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Shirt Size" value={member.shirt_size ?? ""} placeholder="e.g. M, L, XL" onSave={(v) => onUpdate({ shirt_size: v })} />
              <Field label="Pants Size" value={member.pant_size ?? ""} placeholder="e.g. 32x30" onSave={(v) => onUpdate({ pant_size: v })} />
              <Field label="Shoe Size" value={member.shoe_size ?? ""} placeholder="e.g. 10" onSave={(v) => onUpdate({ shoe_size: v })} />
              <Field label="Dress Size" value={member.dress_size ?? ""} placeholder="e.g. 6, S" onSave={(v) => onUpdate({ dress_size: v })} />
              <Field label="Hat Size" value={member.hat_size ?? ""} placeholder="e.g. 7 1/4" onSave={(v) => onUpdate({ hat_size: v })} />
              <div className="col-span-2 sm:col-span-3">
                <Field label="Favorite Clothing Brands" value={member.favorite_brands ?? ""} placeholder="Enter favorite brands" onSave={(v) => onUpdate({ favorite_brands: v })} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Reusable labeled field ── */
function Field({
  label,
  value,
  placeholder,
  onSave,
  as,
}: {
  label: string;
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
  as?: "input" | "textarea";
}) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <InlineField value={value} placeholder={placeholder} onSave={onSave} as={as} />
    </div>
  );
}
