import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X, DollarSign, Clock, FileText } from "lucide-react";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/utils";

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  asap: "ASAP",
  net_15: "Net 15",
  net_30: "Net 30",
  net_45: "Net 45",
  net_60: "Net 60",
  upon_completion: "Upon Completion",
};

interface VendorInvoiceListProps {
  artistId: string;
}

export function VendorInvoiceList({ artistId }: VendorInvoiceListProps) {
  const { selectedTeamId: teamId, canManage } = useSelectedTeam();
  const qc = useQueryClient();

  const { data: invoices = [] } = useQuery({
    queryKey: ["vendor-invoices", artistId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vendor_invoices")
        .select("*, vendors(name)")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!artistId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from("vendor_invoices")
        .update({
          status,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;

      // If approving, create a matching expense transaction
      if (status === "approved") {
        const invoice = invoices.find((i: any) => i.id === id);
        if (invoice) {
          const { error: txErr } = await supabase.from("transactions").insert({
            artist_id: artistId,
            amount: -Math.abs(Number(invoice.amount)),
            description: `Vendor Invoice: ${invoice.description} (${invoice.po_number})`,
            type: "expense",
            status: "pending",
            transaction_date: invoice.invoice_date,
          } as any);
          if (txErr) console.error("Failed to create transaction:", txErr);
        }
      }
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["vendor-invoices", artistId] });
      qc.invalidateQueries({ queryKey: ["finance-transactions", artistId] });
      qc.invalidateQueries({ queryKey: ["transactions", artistId] });
      toast.success(status === "approved" ? "Invoice approved — expense added" : status === "rejected" ? "Invoice rejected" : "Invoice marked as paid");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (invoices.length === 0) return null;

  const pendingCount = invoices.filter((i: any) => i.status === "pending").length;

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge className="bg-amber-100 text-amber-800 text-[10px]"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved": return <Badge className="bg-blue-100 text-blue-800 text-[10px]"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected": return <Badge className="bg-red-100 text-red-800 text-[10px]"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "paid": return <Badge className="bg-emerald-100 text-emerald-800 text-[10px]"><DollarSign className="h-3 w-3 mr-1" />Paid</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Incoming Vendor Invoices</h3>
        {pendingCount > 0 && (
          <Badge className="bg-amber-100 text-amber-800 text-[10px]">{pendingCount} pending</Badge>
        )}
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left p-3 font-medium">PO #</th>
              <th className="text-left p-3 font-medium hidden sm:table-cell">Vendor</th>
              <th className="text-left p-3 font-medium">Description</th>
              <th className="text-right p-3 font-medium">Amount</th>
              <th className="text-left p-3 font-medium hidden sm:table-cell">Terms</th>
              <th className="text-left p-3 font-medium">Status</th>
              {canManage && <th className="text-right p-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv: any) => (
              <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                <td className="p-3 font-mono text-xs">{inv.po_number}</td>
                <td className="p-3 text-muted-foreground hidden sm:table-cell">{inv.vendors?.name || "—"}</td>
                <td className="p-3">
                  <div>
                    <span className="font-medium">{inv.description}</span>
                    {inv.invoice_date && (
                      <span className="block text-xs text-muted-foreground">
                        {format(parseLocalDate(inv.invoice_date), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-right font-semibold tabular-nums">${Number(inv.amount).toLocaleString()}</td>
                <td className="p-3 text-muted-foreground text-xs hidden sm:table-cell">{PAYMENT_TERMS_LABELS[inv.payment_terms] || inv.payment_terms}</td>
                <td className="p-3">{statusBadge(inv.status)}</td>
                {canManage && (
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {inv.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => updateStatus.mutate({ id: inv.id, status: "approved" })}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => updateStatus.mutate({ id: inv.id, status: "rejected" })}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {inv.status === "approved" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 gap-1 text-xs"
                          onClick={() => updateStatus.mutate({ id: inv.id, status: "paid" })}
                        >
                          <DollarSign className="h-3 w-3" />
                          <span className="hidden sm:inline">Mark Paid</span>
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
