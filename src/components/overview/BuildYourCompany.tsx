import { useState, useRef } from "react";
import { Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const COMPANY_TYPES = [
  {
    value: "label",
    label: "Record Label",
    description: "Sign, develop, and release music for artists",
  },
  {
    value: "distribution",
    label: "Distribution",
    description: "Distribute and deliver music to platforms and retailers",
  },
  {
    value: "management",
    label: "Management",
    description: "Manage careers, bookings, and strategy for artists",
  },
  {
    value: "publishing",
    label: "Publishing",
    description: "Administer songwriting rights and collect royalties",
  },
  {
    value: "multi_service",
    label: "Multi-Service",
    description: "Operate across multiple areas of the music business",
  },
];

interface BuildYourCompanyProps {
  teamId: string;
  onComplete: () => void;
}

export function BuildYourCompany({ teamId, onComplete }: BuildYourCompanyProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${teamId}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("profile-photos")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(path);
    const url = `${urlData.publicUrl}?t=${Date.now()}`;
    setLogoUrl(url);
    // Save immediately to team
    await supabase.from("teams").update({ avatar_url: url }).eq("id", teamId);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from("teams")
      .update({ company_type: selected } as any)
      .eq("id", teamId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Company type saved!");
    onComplete();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-4 w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-lg"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLogoUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="mx-auto mb-4 h-20 w-20 rounded-2xl border-2 border-dashed border-border bg-muted/50 flex items-center justify-center relative group hover:border-primary/50 transition-colors overflow-hidden"
        >
          {logoUrl ? (
            <>
              <img src={logoUrl} alt="Company logo" className="h-full w-full object-cover rounded-2xl" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                <Pencil className="h-4 w-4 text-white" />
              </div>
            </>
          ) : (
            <Pencil className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </button>
        <p className="text-xs text-muted-foreground mb-3">
          {uploading ? "Uploading..." : "Add your company logo"}
        </p>
        <h2 className="text-2xl font-bold text-foreground mb-2">Build Your Company</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Tell us what kind of company you are so we can tailor your dashboard and tools to match your workflow.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg"
      >
        {COMPANY_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setSelected(type.value)}
            className={cn(
              "relative text-left rounded-xl border-2 p-4 transition-all duration-200",
              "hover:border-primary/50 hover:bg-accent/50",
              selected === type.value
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card"
            )}
          >
            {selected === type.value && (
              <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
            <p className="font-semibold text-sm text-foreground">{type.label}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{type.description}</p>
          </button>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Button
          size="lg"
          onClick={handleSave}
          disabled={!selected || saving}
          className="px-8"
        >
          {saving ? "Saving..." : "Continue"}
        </Button>
      </motion.div>
    </div>
  );
}
