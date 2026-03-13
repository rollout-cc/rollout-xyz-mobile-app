import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Send, Copy, FileCheck, Clock, AlertCircle } from "lucide-react";

export function VendorManager() {
  const { selectedTeamId: teamId, canManage } = useSelectedTeam();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors", teamId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("vendors").select("*").eq("team_id", teamId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const addVendor = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("vendors").insert({ team_id: teamId, name: name.trim(), email: email.trim() || null, phone: phone.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendors", teamId] });
      setName(""); setEmail(""); setPhone(""); setOpen(false);
      toast.success("Vendor added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const sendW9 = useMutation({
    mutationFn: async (vendorId: string) => {
      const { data, error } = await supabase.functions.invoke("send-vendor-w9-request", { body: { vendor_id: vendorId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendors", teamId] });
      toast.success("W-9 request sent");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/vendor-w9/${token}`);
    toast.success("W-9 link copied");
  };

  const statusBadge = (status: string) => {
    if (status === "completed") return <Badge className="bg-emerald-100 text-emerald-800 text-[10px]"><FileCheck className="h-3 w-3 mr-1" />Complete</Badge>;
    if (status === "pending") return <Badge className="bg-amber-100 text-amber-800 text-[10px]"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    return <Badge variant="outline" className="text-[10px]"><AlertCircle className="h-3 w-3 mr-1" />Not Requested</Badge>;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{vendors.length} vendor{vendors.length !== 1 ? "s" : ""}</p>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Plus className="h-3.5 w-3.5" />Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Add Vendor</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vendor name" /></div>
                <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vendor@email.com" /></div>
                <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" /></div>
                <Button onClick={() => addVendor.mutate()} disabled={!name.trim()} className="w-full">Add Vendor</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left p-3 font-medium">Vendor</th>
              <th className="text-left p-3 font-medium hidden sm:table-cell">Email</th>
              <th className="text-left p-3 font-medium">W-9 Status</th>
              <th className="text-right p-3 font-medium hidden sm:table-cell">Total Paid</th>
              {canManage && <th className="text-right p-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {vendors.map((v: any) => (
              <tr key={v.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                <td className="p-3 font-medium">{v.name}</td>
                <td className="p-3 text-muted-foreground hidden sm:table-cell">{v.email || "—"}</td>
                <td className="p-3">{statusBadge(v.w9_status)}</td>
                <td className="p-3 text-right font-medium tabular-nums hidden sm:table-cell">${Number(v.total_paid).toLocaleString()}</td>
                {canManage && (
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {v.w9_status !== "completed" && v.email && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={() => sendW9.mutate(v.id)}>
                          <Send className="h-3 w-3" />
                          <span className="hidden sm:inline text-xs">Send W-9</span>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={() => copyLink(v.w9_token)}>
                        <Copy className="h-3 w-3" />
                        <span className="hidden sm:inline text-xs">Copy Link</span>
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {vendors.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No vendors yet. Add one to get started.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
