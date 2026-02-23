import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, User, Plane, Shirt } from "lucide-react";
import { toast } from "sonner";

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
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    primary_goal: artist.primary_goal ?? "",
    secondary_goal: artist.secondary_goal ?? "",
    primary_focus: artist.primary_focus ?? "",
    secondary_focus: artist.secondary_focus ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("artists").update(form).eq("id", artist.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist", artist.id] });
      setEditing(false);
      toast.success("Saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2"><User className="h-4 w-4" /> Personal Info</h3>
        {!editing ? (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
          </div>
        )}
      </div>
      {editing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(["primary_goal", "secondary_goal", "primary_focus", "secondary_focus"] as const).map((key) => (
            <div key={key} className="space-y-1">
              <Label className="capitalize">{key.replace("_", " ")}</Label>
              <Input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            ["Primary Goal", artist.primary_goal],
            ["Secondary Goal", artist.secondary_goal],
            ["Primary Focus", artist.primary_focus],
            ["Secondary Focus", artist.secondary_focus],
          ].map(([label, val]) => (
            <div key={label}>
              <span className="text-muted-foreground">{label}: </span>
              <span>{val || "—"}</span>
            </div>
          ))}
        </div>
      )}
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

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", email: "", phone: "" });

  const addContact = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("artist_contacts").insert({ ...form, artist_id: artistId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist_contacts", artistId] });
      setForm({ name: "", role: "", email: "", phone: "" });
      setShowAdd(false);
      toast.success("Contact added");
    },
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
        <Button variant="ghost" size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
      {showAdd && (
        <div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-lg border border-border">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <div className="col-span-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" onClick={() => addContact.mutate()} disabled={!form.name.trim()}>Save</Button>
          </div>
        </div>
      )}
      {contacts.length === 0 && !showAdd ? (
        <p className="text-sm text-muted-foreground">No contacts yet.</p>
      ) : (
        <div className="space-y-2">
          {contacts.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border text-sm">
              <div>
                <span className="font-medium">{c.name}</span>
                {c.role && <span className="text-muted-foreground ml-2">({c.role})</span>}
                <div className="text-muted-foreground">{[c.email, c.phone].filter(Boolean).join(" · ")}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteContact.mutate(c.id)}>
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

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ passport_name: "", dietary_restrictions: "", notes: "" });

  const startEdit = () => {
    setForm({
      passport_name: travel?.passport_name ?? "",
      dietary_restrictions: travel?.dietary_restrictions ?? "",
      notes: travel?.notes ?? "",
    });
    setEditing(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (travel) {
        const { error } = await supabase.from("artist_travel_info").update(form).eq("id", travel.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("artist_travel_info").insert({ ...form, artist_id: artistId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist_travel_info", artistId] });
      setEditing(false);
      toast.success("Saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2"><Plane className="h-4 w-4" /> Travel Info</h3>
        {!editing && <Button variant="ghost" size="sm" onClick={startEdit}>Edit</Button>}
      </div>
      {editing ? (
        <div className="space-y-3 p-3 rounded-lg border border-border">
          <div className="space-y-1">
            <Label>Passport Name</Label>
            <Input value={form.passport_name} onChange={(e) => setForm({ ...form, passport_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Dietary Restrictions</Label>
            <Input value={form.dietary_restrictions} onChange={(e) => setForm({ ...form, dietary_restrictions: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={() => save.mutate()}>Save</Button>
          </div>
        </div>
      ) : (
        <div className="text-sm space-y-1">
          <div><span className="text-muted-foreground">Passport Name:</span> {travel?.passport_name || "—"}</div>
          <div><span className="text-muted-foreground">Dietary:</span> {travel?.dietary_restrictions || "—"}</div>
          <div><span className="text-muted-foreground">Notes:</span> {travel?.notes || "—"}</div>
        </div>
      )}
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

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ shirt_size: "", pant_size: "", shoe_size: "", notes: "" });

  const startEdit = () => {
    setForm({
      shirt_size: clothing?.shirt_size ?? "",
      pant_size: clothing?.pant_size ?? "",
      shoe_size: clothing?.shoe_size ?? "",
      notes: clothing?.notes ?? "",
    });
    setEditing(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (clothing) {
        const { error } = await supabase.from("artist_clothing").update(form).eq("id", clothing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("artist_clothing").insert({ ...form, artist_id: artistId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist_clothing", artistId] });
      setEditing(false);
      toast.success("Saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2"><Shirt className="h-4 w-4" /> Clothing</h3>
        {!editing && <Button variant="ghost" size="sm" onClick={startEdit}>Edit</Button>}
      </div>
      {editing ? (
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border">
          <div className="space-y-1"><Label>Shirt Size</Label><Input value={form.shirt_size} onChange={(e) => setForm({ ...form, shirt_size: e.target.value })} /></div>
          <div className="space-y-1"><Label>Pant Size</Label><Input value={form.pant_size} onChange={(e) => setForm({ ...form, pant_size: e.target.value })} /></div>
          <div className="space-y-1"><Label>Shoe Size</Label><Input value={form.shoe_size} onChange={(e) => setForm({ ...form, shoe_size: e.target.value })} /></div>
          <div className="col-span-2 space-y-1"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="col-span-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={() => save.mutate()}>Save</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Shirt:</span> {clothing?.shirt_size || "—"}</div>
          <div><span className="text-muted-foreground">Pants:</span> {clothing?.pant_size || "—"}</div>
          <div><span className="text-muted-foreground">Shoes:</span> {clothing?.shoe_size || "—"}</div>
          <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {clothing?.notes || "—"}</div>
        </div>
      )}
    </section>
  );
}
