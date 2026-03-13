import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface InvoiceListProps {
  artistId?: string;
}

export function InvoiceList({ artistId }: InvoiceListProps) {
  const { selectedTeamId: teamId, canManage } = useSelectedTeam();
  const qc = useQueryClient();

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", teamId, artistId],
    queryFn: async () => {
      let q = (supabase as any).from("invoices").select("*").eq("team_id", teamId!).order("created_at", { ascending: false });
      if (artistId) q = q.eq("artist_id", artistId);
      else q = q.is("artist_id", null);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const sendInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase.functions.invoke("send-invoice", { body: { invoice_id: invoiceId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice sent");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("invoices").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Marked as paid");
    },
  });

  const cancelInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("invoices").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice cancelled");
    },
  });

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      sent: "bg-blue-100 text-blue-800",
      viewed: "bg-indigo-100 text-indigo-800",
      paid: "bg-emerald-100 text-emerald-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-muted text-muted-foreground line-through",
    };
    return <Badge className={cn("text-[10px] capitalize", styles[status] || "")}>{status}</Badge>;
  };

  const fmt = (n: number) => `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  if (invoices.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">No invoices yet.</p>;
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left p-3 font-medium">Invoice #</th>
            <th className="text-left p-3 font-medium">Recipient</th>
            <th className="text-left p-3 font-medium hidden sm:table-cell">Date</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-right p-3 font-medium">Total</th>
            {canManage && <th className="text-right p-3 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv: any) => (
            <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-accent/30">
              <td className="p-3 font-medium tabular-nums">{inv.invoice_number}</td>
              <td className="p-3">
                <div className="truncate max-w-[140px]">{inv.recipient_name}</div>
              </td>
              <td className="p-3 text-muted-foreground hidden sm:table-cell">{format(new Date(inv.issue_date), "MMM d, yyyy")}</td>
              <td className="p-3">{statusBadge(inv.status)}</td>
              <td className="p-3 text-right font-semibold tabular-nums">{fmt(inv.total)}</td>
              {canManage && (
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {inv.status === "draft" && inv.recipient_email && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={() => sendInvoice.mutate(inv.id)}>
                        <Send className="h-3 w-3" /><span className="hidden sm:inline text-xs">Send</span>
                      </Button>
                    )}
                    {(inv.status === "sent" || inv.status === "viewed" || inv.status === "overdue") && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-emerald-600" onClick={() => markPaid.mutate(inv.id)}>
                        <CheckCircle className="h-3 w-3" /><span className="hidden sm:inline text-xs">Paid</span>
                      </Button>
                    )}
                    {inv.status !== "paid" && inv.status !== "cancelled" && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground" onClick={() => cancelInvoice.mutate(inv.id)}>
                        <XCircle className="h-3 w-3" />
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
  );
}
