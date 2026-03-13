import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

interface InvoiceCreatorProps {
  artistId?: string;
}

export function InvoiceCreator({ artistId }: InvoiceCreatorProps) {
  const { selectedTeamId: teamId } = useSelectedTeam();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [vendorId, setVendorId] = useState("manual");
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: "", quantity: "1", unitPrice: "" }]);

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors", teamId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("vendors").select("id, name, email").eq("team_id", teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId && open,
  });

  const addLine = () => setLineItems([...lineItems, { description: "", quantity: "1", unitPrice: "" }]);
  const removeLine = (i: number) => setLineItems(lineItems.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof LineItem, val: string) => {
    const copy = [...lineItems];
    copy[i] = { ...copy[i], [field]: val };
    setLineItems(copy);
  };

  const subtotal = lineItems.reduce((s, li) => s + (parseFloat(li.quantity) || 0) * (parseFloat(li.unitPrice) || 0), 0);
  const tax = subtotal * (parseFloat(taxRate) || 0) / 100;
  const total = subtotal + tax;

  const create = useMutation({
    mutationFn: async () => {
      // Get next invoice number
      const { data: numData } = await (supabase as any).rpc("next_invoice_number", { p_team_id: teamId });
      const invoiceNumber = numData || `INV-${Date.now()}`;

      const { data: invoice, error } = await (supabase as any).from("invoices").insert({
        team_id: teamId,
        artist_id: artistId || null,
        vendor_id: vendorId !== "manual" ? vendorId : null,
        invoice_number: invoiceNumber,
        recipient_name: recipientName,
        recipient_email: recipientEmail || null,
        issue_date: issueDate,
        due_date: dueDate || null,
        subtotal,
        tax_rate: parseFloat(taxRate) || 0,
        total,
        notes: notes || null,
      }).select("id").single();
      if (error) throw error;

      const items = lineItems
        .filter(li => li.description.trim() && li.unitPrice)
        .map((li, i) => ({
          invoice_id: invoice.id,
          description: li.description.trim(),
          quantity: parseFloat(li.quantity) || 1,
          unit_price: parseFloat(li.unitPrice) || 0,
          amount: (parseFloat(li.quantity) || 1) * (parseFloat(li.unitPrice) || 0),
          sort_order: i,
        }));

      if (items.length) {
        const { error: liErr } = await (supabase as any).from("invoice_line_items").insert(items);
        if (liErr) throw liErr;
      }

      return invoice.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      resetForm();
      setOpen(false);
      toast.success("Invoice created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setRecipientName(""); setRecipientEmail(""); setVendorId("manual");
    setIssueDate(format(new Date(), "yyyy-MM-dd")); setDueDate("");
    setTaxRate(""); setNotes("");
    setLineItems([{ description: "", quantity: "1", unitPrice: "" }]);
  };

  const handleVendorSelect = (v: string) => {
    setVendorId(v);
    if (v !== "manual") {
      const vendor = vendors.find((vn: any) => vn.id === v);
      if (vendor) {
        setRecipientName(vendor.name);
        setRecipientEmail(vendor.email || "");
      }
    }
  };

  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" />New Invoice
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>Create Invoice</SheetTitle></SheetHeader>
        <div className="space-y-4 pt-4">
          {/* Recipient */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recipient</Label>
            <Select value={vendorId} onValueChange={handleVendorSelect}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select vendor or enter manually" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Enter manually</SelectItem>
                {vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name *</Label><Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Recipient name" /></div>
            <div><Label>Email</Label><Input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="email@example.com" /></div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Issue Date</Label><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></div>
            <div><Label>Due Date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>

          {/* Line Items */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Line Items</Label>
            <div className="space-y-2 mt-2">
              {lineItems.map((li, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Input className="flex-1" placeholder="Description" value={li.description} onChange={(e) => updateLine(i, "description", e.target.value)} />
                  <Input className="w-16" placeholder="Qty" value={li.quantity} onChange={(e) => updateLine(i, "quantity", e.target.value)} />
                  <CurrencyInput className="w-28" value={li.unitPrice} onChange={(v) => updateLine(i, "unitPrice", v)} placeholder="0.00" />
                  <div className="w-20 text-right text-sm font-medium pt-2.5 tabular-nums">
                    {fmt((parseFloat(li.quantity) || 0) * (parseFloat(li.unitPrice) || 0))}
                  </div>
                  {lineItems.length > 1 && (
                    <Button variant="ghost" size="sm" className="h-10 px-2 text-muted-foreground" onClick={() => removeLine(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={addLine}>
                <Plus className="h-3 w-3" />Add line
              </Button>
            </div>
          </div>

          {/* Tax */}
          <div className="w-32">
            <Label>Tax Rate (%)</Label>
            <Input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="0" />
          </div>

          {/* Totals */}
          <div className="rounded-lg border border-border p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium tabular-nums">{fmt(subtotal)}</span></div>
            {parseFloat(taxRate) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax ({taxRate}%)</span><span className="font-medium tabular-nums">{fmt(tax)}</span></div>}
            <div className="flex justify-between pt-1 border-t border-border"><span className="font-semibold">Total</span><span className="font-bold tabular-nums text-base">{fmt(total)}</span></div>
          </div>

          {/* Notes */}
          <div><Label>Notes / Terms</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, notes..." rows={2} /></div>

          <Button onClick={() => create.mutate()} disabled={!recipientName.trim() || lineItems.every(li => !li.description.trim())} className="w-full">
            Create Invoice
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
