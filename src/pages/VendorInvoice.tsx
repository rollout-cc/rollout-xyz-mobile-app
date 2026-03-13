import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { toast } from "sonner";
import { CheckCircle, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  asap: "Due Immediately",
  net_15: "Net 15",
  net_30: "Net 30",
  net_45: "Net 45",
  net_60: "Net 60",
  upon_completion: "Upon Completion of Services",
};

export default function VendorInvoice() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [poNumber, setPoNumber] = useState("");
  const [error, setError] = useState("");

  // Vendor info (loaded from token)
  const [vendorName, setVendorName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("net_30");
  const [w9Complete, setW9Complete] = useState(false);

  // Form fields
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadVendor() {
      try {
        // Look up vendor info via public query (vendors table has public token-based access via edge function)
        // We'll use the edge function to validate and return vendor info
        const { data, error: err } = await supabase.functions.invoke("submit-vendor-invoice", {
          body: { token, _preview: true },
        });
        // If preview mode isn't supported, we just show the form and validate on submit
        if (err || data?.error) {
          // Try a lightweight lookup - we'll validate fully on submit
          setLoading(false);
          return;
        }
        if (data?.vendor_name) setVendorName(data.vendor_name);
        if (data?.artist_name) setArtistName(data.artist_name);
        if (data?.payment_terms) setPaymentTerms(data.payment_terms);
        if (data?.w9_complete) setW9Complete(data.w9_complete);
      } catch {
        // Will validate on submit
      } finally {
        setLoading(false);
      }
    }
    loadVendor();
  }, [token]);

  const handleSubmit = async () => {
    if (!description.trim() || !amount || !invoiceDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const { data, error: err } = await supabase.functions.invoke("submit-vendor-invoice", {
        body: {
          token,
          description: description.trim(),
          amount: parseFloat(amount),
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          notes: notes.trim() || null,
        },
      });
      if (err) throw err;
      if (data?.error) throw new Error(data.error);
      setSubmitted(true);
      setPoNumber(data?.po_number || "");
    } catch (err: any) {
      setError(err.message || "Failed to submit invoice");
      toast.error(err.message || "Failed to submit invoice");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
          <h1 className="text-2xl font-bold">Invoice Submitted</h1>
          {poNumber && (
            <p className="text-lg font-mono text-muted-foreground">{poNumber}</p>
          )}
          <p className="text-muted-foreground">
            Your invoice has been submitted for review. You'll be paid according to the agreed payment terms. You can close this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/rollout-flag.png" alt="Rollout" className="h-10 mx-auto mb-4" />
          <h1 className="text-xl font-bold flex items-center justify-center gap-2">
            <FileText className="h-5 w-5" />
            Submit Invoice
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fill out the details below to submit your invoice for payment
          </p>
        </div>

        {/* Pre-filled context */}
        {(vendorName || artistName || paymentTerms) && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 mb-6 space-y-2">
            {vendorName && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vendor</span>
                <span className="font-medium">{vendorName}</span>
              </div>
            )}
            {artistName && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Artist</span>
                <span className="font-medium">{artistName}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment Terms</span>
              <span className="font-medium">{PAYMENT_TERMS_LABELS[paymentTerms] || paymentTerms}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 text-destructive text-sm p-3 mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="space-y-5">
          <div>
            <Label>Description of Services *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the work or services provided..."
              className="mt-1.5 min-h-[80px]"
            />
          </div>

          <div>
            <Label>Amount *</Label>
            <div className="mt-1.5">
              <CurrencyInput
                value={amount}
                onChange={setAmount}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Invoice Date *</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Due Date (optional)</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              className="mt-1.5"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || !description.trim() || !amount || !invoiceDate}
            className="w-full h-11 text-base gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Invoice"
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-12">
          Your invoice is submitted securely via{" "}
          <a href="https://rollout.cc" className="underline">Rollout</a>.
        </p>
      </div>
    </div>
  );
}
