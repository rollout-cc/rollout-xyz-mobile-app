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
import { Plus, Send, Copy, FileCheck, Clock, AlertCircle, Eye, Building2, MapPin, CreditCard, User } from "lucide-react";

export function VendorManager() {
  const { selectedTeamId: teamId, canManage } = useSelectedTeam();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [viewW9Open, setViewW9Open] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
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

  const { data: w9Data } = useQuery({
    queryKey: ["vendor-w9", selectedVendor?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vendor_w9_data")
        .select("*")
        .eq("vendor_id", selectedVendor.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedVendor?.id && viewW9Open,
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

  const openViewW9 = (vendor: any) => {
    setSelectedVendor(vendor);
    setViewW9Open(true);
  };

  const formatPaymentMethod = (w9: any) => {
    if (!w9) return "—";
    switch (w9.payment_method) {
      case "bank_transfer": return "Bank Transfer (ACH)";
      case "paypal": return `PayPal (${w9.paypal_email})`;
      case "venmo": return `Venmo (${w9.venmo_handle})`;
      case "check": return "Check (mailed)";
      default: return w9.payment_method;
    }
  };

  const formatAddress = (w9: any) => {
    if (!w9) return "—";
    const parts = [w9.address_line1, w9.address_line2, `${w9.city}, ${w9.state} ${w9.zip}`].filter(Boolean);
    return parts.join(", ");
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
                      {v.w9_status === "completed" && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={() => openViewW9(v)}>
                          <Eye className="h-3 w-3" />
                          <span className="hidden sm:inline text-xs">View W-9</span>
                        </Button>
                      )}
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

      {/* View W-9 Dialog */}
      <Dialog open={viewW9Open} onOpenChange={setViewW9Open}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-emerald-500" />
              W-9 Information — {selectedVendor?.name}
            </DialogTitle>
          </DialogHeader>
          {w9Data ? (
            <div className="space-y-6 pt-2">
              {/* Taxpayer Info */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Taxpayer Information
                </h4>
                <div className="rounded-lg border border-border p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Legal Name</span>
                    <span className="font-medium">{w9Data.legal_name}</span>
                  </div>
                  {w9Data.business_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Business Name</span>
                      <span className="font-medium">{w9Data.business_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax Classification</span>
                    <span className="font-medium capitalize">{w9Data.federal_tax_classification.replace(/_/g, " ")}</span>
                  </div>
                  {w9Data.llc_classification && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">LLC Classification</span>
                      <span className="font-medium">{w9Data.llc_classification} Corporation</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Address
                </h4>
                <div className="rounded-lg border border-border p-3 text-sm">
                  {formatAddress(w9Data)}
                </div>
              </div>

              {/* TIN */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Taxpayer Identification Number
                </h4>
                <div className="rounded-lg border border-border p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium uppercase">{w9Data.tin_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Number</span>
                    <span className="font-medium font-mono">••••••••{w9Data.tin_last_four}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  Payment Method
                </h4>
                <div className="rounded-lg border border-border p-3 text-sm">
                  {formatPaymentMethod(w9Data)}
                </div>
              </div>

              {/* Signature */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Certification</h4>
                <div className="rounded-lg bg-muted/30 p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Signed By</span>
                    <span className="font-medium">{w9Data.signature_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">{w9Data.signature_date}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Full TIN and bank details are encrypted and not displayed for security.
              </p>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">Loading W-9 data...</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

