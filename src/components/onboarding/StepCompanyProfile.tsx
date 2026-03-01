import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  companyName: string;
  setCompanyName: (v: string) => void;
  logoUrl: string | null;
  onLogoUpload: (file: File) => Promise<void>;
}

export function StepCompanyProfile({ companyName, setCompanyName, logoUrl, onLogoUpload }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await onLogoUpload(file);
    setUploading(false);
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-foreground mb-2">Set up your company</h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        Add your company name and logo to personalize your workspace.
      </p>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="mx-auto mb-2 h-20 w-20 rounded-2xl border-2 border-dashed border-border bg-muted/50 flex items-center justify-center relative group hover:border-primary/50 transition-colors overflow-hidden"
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
      <p className="text-xs text-muted-foreground text-center mb-6">
        {uploading ? "Uploading..." : "Add your company logo"}
      </p>

      <div>
        <Label className="font-semibold text-sm mb-2 block">What's your company name?</Label>
        <Input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. My Company"
          autoFocus
        />
      </div>
    </>
  );
}
