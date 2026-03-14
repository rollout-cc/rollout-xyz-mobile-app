import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { getPlatformLogo } from "./PlatformLogos";
import type { ReleaseFormData } from "./ReleaseWizard";

interface Props {
  form: ReleaseFormData;
  updateForm: (patch: Partial<ReleaseFormData>) => void;
}

export function StepPlatforms({ form, updateForm }: Props) {
  const allEnabled = form.platforms.every((p) => p.enabled);

  const toggleAll = () => {
    updateForm({
      platforms: form.platforms.map((p) => ({ ...p, enabled: !allEnabled })),
    });
  };

  const togglePlatform = (platform: string) => {
    updateForm({
      platforms: form.platforms.map((p) =>
        p.platform === platform ? { ...p, enabled: !p.enabled } : p
      ),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-foreground mb-1">Distribution Partners</h3>
        <p className="text-sm text-muted-foreground">
          Choose which streaming platforms to distribute to
        </p>
      </div>

      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Switch checked={allEnabled} onCheckedChange={toggleAll} />
        <Label className="text-sm font-medium">Select All</Label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {form.platforms.map((p) => (
          <Card
            key={p.platform}
            onClick={() => togglePlatform(p.platform)}
            className={`p-4 cursor-pointer transition-all flex flex-col items-center gap-2 text-center ${
              p.enabled
                ? "border-primary bg-primary/5"
                : "border-border opacity-60 hover:opacity-100"
            }`}
          >
            <div className="h-7 w-7 flex items-center justify-center">
              {getPlatformLogo(p.platform)}
            </div>
            <span className="text-xs font-medium leading-tight">{p.platform}</span>
            <Checkbox checked={p.enabled} className="mt-1" />
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {form.platforms.filter((p) => p.enabled).length} of {form.platforms.length} platforms selected
      </p>
    </div>
  );
}
