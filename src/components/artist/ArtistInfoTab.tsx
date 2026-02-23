import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, User, Plane, Shirt } from "lucide-react";
import { toast } from "sonner";
import { InlineField } from "@/components/ui/InlineField";

interface ArtistInfoTabProps {
  artist: any;
}

export function ArtistInfoTab({ artist }: ArtistInfoTabProps) {
  return (
    <div className="space-y-8 mt-4">
      <PersonalInfoSection artist={artist} />
      <ContactsSection artistId={artist.id} />
      <TravelSection artistId={artist.id} />
      <ClothingSection artistId={artist.id} />
    </div>
  );
}

function PersonalInfoSection({ artist }: { artist: any }) {
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
      <h3 className="font-semibold flex items-center gap-2 mb-3"><User className="h-4 w-4" /> Personal Info</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {fields.map(({ key, label }) => (
          <div key={key}>
            <span className="text-muted-foreground">{label}: </span>
            <InlineField
              value={artist[key] ?? ""}
              placeholder="—"
              onSave={(v) => save.mutate({ [key]: v })}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function ContactsSection({ artistId }: { artistId: string }) {
  const queryClient = useQueryClient();
  const { data: contacts = [] } = useQuery({
    queryKey: ["artist_contacts", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_contacts")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const [adding, setAdding] = useState(false);

  const addContact = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("artist_contacts").insert({ name: "New Contact", artist_id: artistId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist_contacts", artistId] });
      setAdding(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, string> }) => {
      const { error } = await supabase.from("artist_contacts").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist_contacts", artistId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("artist_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist_contacts", artistId] }),
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Contacts</h3>
        <Button variant="ghost" size="sm" onClick={() => addContact.mutate()}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contacts yet. Click Add to create one.</p>
      ) : (
        <div className="space-y-2">
          {contacts.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border text-sm group">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <InlineField value={c.name} onSave={(v) => updateContact.mutate({ id: c.id, patch: { name: v } })} className="font-medium" />
                  <InlineField value={c.role ?? ""} placeholder="Role" onSave={(v) => updateContact.mutate({ id: c.id, patch: { role: v } })} className="text-muted-foreground" />
                </div>
                <div className="flex items-center gap-4">
                  <InlineField value={c.email ?? ""} placeholder="Email" onSave={(v) => updateContact.mutate({ id: c.id, patch: { email: v } })} />
                  <InlineField value={c.phone ?? ""} placeholder="Phone" onSave={(v) => updateContact.mutate({ id: c.id, patch: { phone: v } })} />
                </div>
              </div>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={() => deleteContact.mutate(c.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TravelSection({ artistId }: { artistId: string }) {
  const queryClient = useQueryClient();
  const { data: travel } = useQuery({
    queryKey: ["artist_travel_info", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_travel_info")
        .select("*")
        .eq("artist_id", artistId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async (patch: Record<string, string>) => {
      if (travel) {
        const { error } = await supabase.from("artist_travel_info").update(patch).eq("id", travel.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("artist_travel_info").insert({ ...patch, artist_id: artistId });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist_travel_info", artistId] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <section>
      <h3 className="font-semibold flex items-center gap-2 mb-3"><Plane className="h-4 w-4" /> Travel Info</h3>
      <div className="text-sm space-y-2">
        <div><span className="text-muted-foreground">Passport Name: </span>
          <InlineField value={travel?.passport_name ?? ""} placeholder="—" onSave={(v) => upsert.mutate({ passport_name: v })} />
        </div>
        <div><span className="text-muted-foreground">Dietary: </span>
          <InlineField value={travel?.dietary_restrictions ?? ""} placeholder="—" onSave={(v) => upsert.mutate({ dietary_restrictions: v })} />
        </div>
        <div><span className="text-muted-foreground">Notes: </span>
          <InlineField value={travel?.notes ?? ""} placeholder="—" onSave={(v) => upsert.mutate({ notes: v })} as="textarea" />
        </div>
      </div>
    </section>
  );
}

function ClothingSection({ artistId }: { artistId: string }) {
  const queryClient = useQueryClient();
  const { data: clothing } = useQuery({
    queryKey: ["artist_clothing", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_clothing")
        .select("*")
        .eq("artist_id", artistId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async (patch: Record<string, string>) => {
      if (clothing) {
        const { error } = await supabase.from("artist_clothing").update(patch).eq("id", clothing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("artist_clothing").insert({ ...patch, artist_id: artistId });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist_clothing", artistId] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <section>
      <h3 className="font-semibold flex items-center gap-2 mb-3"><Shirt className="h-4 w-4" /> Clothing</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-muted-foreground">Shirt: </span>
          <InlineField value={clothing?.shirt_size ?? ""} placeholder="—" onSave={(v) => upsert.mutate({ shirt_size: v })} />
        </div>
        <div><span className="text-muted-foreground">Pants: </span>
          <InlineField value={clothing?.pant_size ?? ""} placeholder="—" onSave={(v) => upsert.mutate({ pant_size: v })} />
        </div>
        <div><span className="text-muted-foreground">Shoes: </span>
          <InlineField value={clothing?.shoe_size ?? ""} placeholder="—" onSave={(v) => upsert.mutate({ shoe_size: v })} />
        </div>
        <div className="col-span-2"><span className="text-muted-foreground">Notes: </span>
          <InlineField value={clothing?.notes ?? ""} placeholder="—" onSave={(v) => upsert.mutate({ notes: v })} as="textarea" />
        </div>
      </div>
    </section>
  );
}
