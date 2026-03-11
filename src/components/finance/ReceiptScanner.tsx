import { useState, useRef } from "react";
import { Camera, Upload, X, Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface ExtractedReceipt {
  description: string;
  amount: number;
  date: string;
  category_hint?: string;
  line_items?: { name: string; amount: number }[];
}

interface ReceiptScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { description: string; amount: number; date: string; categoryHint?: string }) => void;
}

export function ReceiptScanner({ open, onOpenChange, onConfirm }: ReceiptScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedReceipt | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setScanning(false);
    setPreview(null);
    setExtracted(null);
    setEditDesc("");
    setEditAmount("");
    setEditDate("");
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      setScanning(true);

      try {
        const base64 = dataUrl.split(",")[1];
        const { data, error } = await supabase.functions.invoke("scan-receipt", {
          body: { image_base64: base64, mime_type: file.type },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const receipt = data as ExtractedReceipt;
        setExtracted(receipt);
        setEditDesc(receipt.description || "");
        setEditAmount(String(receipt.amount || ""));
        setEditDate(receipt.date || format(new Date(), "yyyy-MM-dd"));
      } catch (err: any) {
        console.error("Scan error:", err);
        toast.error(err.message || "Failed to scan receipt");
        setPreview(null);
      } finally {
        setScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    const amount = parseFloat(editAmount);
    if (!editDesc.trim() || isNaN(amount) || amount <= 0) {
      toast.error("Please fill in description and amount");
      return;
    }
    onConfirm({
      description: editDesc.trim(),
      amount,
      date: editDate || format(new Date(), "yyyy-MM-dd"),
      categoryHint: extracted?.category_hint,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Scan Receipt
          </DialogTitle>
        </DialogHeader>

        {!preview && !extracted && (
          <div className="flex flex-col items-center gap-4 py-6">
            <p className="text-sm text-muted-foreground text-center">
              Take a photo or upload an image of your receipt
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.capture = "environment";
                  input.onchange = (e) => {
                    const f = (e.target as HTMLInputElement).files?.[0];
                    if (f) handleFile(f);
                  };
                  input.click();
                }}
              >
                <Camera className="h-4 w-4 mr-2" />
                Camera
              </Button>
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        )}

        {scanning && preview && (
          <div className="flex flex-col items-center gap-4 py-4">
            <img src={preview} alt="Receipt" className="max-h-48 rounded-lg object-contain" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Scanning receipt…
            </div>
          </div>
        )}

        {extracted && !scanning && (
          <div className="space-y-4 py-2">
            {preview && (
              <div className="relative">
                <img src={preview} alt="Receipt" className="max-h-32 rounded-lg object-contain mx-auto" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={reset}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Amount</label>
                <CurrencyInput value={editAmount} onChange={setEditAmount} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
              {extracted.category_hint && (
                <p className="text-xs text-muted-foreground">
                  Suggested category: <span className="font-medium capitalize">{extracted.category_hint}</span>
                </p>
              )}
              {extracted.line_items && extracted.line_items.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Line Items</p>
                  <div className="space-y-1 text-xs">
                    {extracted.line_items.map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{item.name}</span>
                        <span className="tabular-nums">${item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { reset(); }}>
                Retake
              </Button>
              <Button className="flex-1" onClick={handleConfirm}>
                Add Expense
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
