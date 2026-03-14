import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Check, ExternalLink, Shield, FileText, Info } from "lucide-react";
import { useSplitContributors } from "@/hooks/useSplits";
import { useSplitSongs } from "@/hooks/useSplits";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ReleaseFormData } from "./ReleaseWizard";

interface Props {
  form: ReleaseFormData;
  updateForm: (patch: Partial<ReleaseFormData>) => void;
  teamId: string;
}

export function StepRightsRegistration({ form, updateForm, teamId }: Props) {
  const { data: contributors = [] } = useSplitContributors(teamId);
  const { data: splitSongs = [] } = useSplitSongs(form.split_project_id || undefined);

  const songIds = splitSongs.map((s: any) => s.id);
  const { data: allEntries = [] } = useQuery({
    queryKey: ["split-entries-batch", form.split_project_id],
    queryFn: async () => {
      if (songIds.length === 0) return [];
      const { data, error } = await supabase
        .from("split_entries")
        .select("*, contributor:split_contributors(*)")
        .in("song_id", songIds);
      if (error) throw error;
      return data;
    },
    enabled: songIds.length > 0,
  });

  const uniqueContributors = new Map<string, any>();
  allEntries.forEach((entry: any) => {
    if (entry.contributor && !uniqueContributors.has(entry.contributor.id)) {
      uniqueContributors.set(entry.contributor.id, entry.contributor);
    }
  });
  const contribList = Array.from(uniqueContributors.values());

  const missingPro = contribList.filter((c) => !c.pro_affiliation);
  const missingIpi = contribList.filter((c) => !c.ipi_number);

  if (!form.split_project_id) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-foreground mb-1">Rights Registration</h3>
          <p className="text-sm text-muted-foreground">
            Verify PRO affiliations, IPI numbers, and MLC registration before distributing
          </p>
        </div>

        <Card className="p-6 border-dashed space-y-3">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">No split project linked yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                PRO and IPI validation will be available once you create or link a split project in the Approvals step. 
                You can still configure MLC and Copyright registration below.
              </p>
            </div>
          </div>
        </Card>

        {/* MLC + Copyright still available without split project */}
        <MlcCard form={form} updateForm={updateForm} />
        <CopyrightCard form={form} updateForm={updateForm} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-foreground mb-1">Rights Registration</h3>
        <p className="text-sm text-muted-foreground">
          Verify PRO affiliations, IPI numbers, and MLC registration before distributing
        </p>
      </div>

      {/* PRO Registration */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h4 className="text-foreground">PRO Affiliations</h4>
          {missingPro.length > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {missingPro.length} missing
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Each songwriter/publisher needs a Performing Rights Organization (ASCAP, BMI, SESAC) 
          and IPI number to collect performance royalties.
        </p>
        <div className="space-y-2">
          {contribList.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No contributors found</p>
          ) : (
            contribList.map((c: any) => (
              <ContributorRow key={c.id} contributor={c} />
            ))
          )}
        </div>
      </Card>

      <MlcCard form={form} updateForm={updateForm} />
      <CopyrightCard form={form} updateForm={updateForm} />
    </div>
  );
}

function ContributorRow({ contributor: c }: { contributor: any }) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-md bg-muted/50">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{c.name}</div>
        <div className="text-xs text-muted-foreground">
          {c.publisher_name || "No publisher"}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {c.pro_affiliation ? (
          <Badge variant="secondary" className="text-[10px]">
            <Check className="h-2.5 w-2.5 mr-1" />
            {c.pro_affiliation}
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-[10px]">
            <AlertTriangle className="h-2.5 w-2.5 mr-1" />
            No PRO
          </Badge>
        )}
        {c.ipi_number ? (
          <Badge variant="secondary" className="text-[10px]">
            IPI: {c.ipi_number}
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-[10px]">
            <AlertTriangle className="h-2.5 w-2.5 mr-1" />
            No IPI
          </Badge>
        )}
      </div>
    </div>
  );
}

function MlcCard({ form, updateForm }: { form: ReleaseFormData; updateForm: (p: Partial<ReleaseFormData>) => void }) {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <h4 className="text-foreground">MLC Registration</h4>
      </div>
      <p className="text-xs text-muted-foreground">
        Songs must be registered with The Mechanical Licensing Collective (MLC) to collect 
        mechanical royalties from streaming.
      </p>
      <div className="flex items-center gap-3 py-2">
        <Switch
          checked={form.mlc_registration_status === "completed"}
          onCheckedChange={(checked) =>
            updateForm({ mlc_registration_status: checked ? "completed" : "not_started" })
          }
        />
        <span className="text-sm">
          {form.mlc_registration_status === "completed"
            ? "Songs registered with The MLC"
            : "Mark as registered with The MLC"}
        </span>
      </div>
      <a
        href="https://www.themlc.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ExternalLink className="h-3 w-3" /> Visit The MLC
      </a>
    </Card>
  );
}

function CopyrightCard({ form, updateForm }: { form: ReleaseFormData; updateForm: (p: Partial<ReleaseFormData>) => void }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <h4 className="text-foreground">Copyright Registration</h4>
        <Badge variant="secondary" className="text-[10px]">Optional</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Register your sound recordings and compositions with the U.S. Copyright Office 
        for additional legal protection.
      </p>
      <div className="flex items-center gap-3 py-2">
        <Switch
          checked={form.pro_registration_status === "completed"}
          onCheckedChange={(checked) =>
            updateForm({ pro_registration_status: checked ? "completed" : "not_started" })
          }
        />
        <span className="text-sm">
          {form.pro_registration_status === "completed"
            ? "Copyright registered"
            : "Mark copyright as registered"}
        </span>
      </div>
      <a
        href="https://www.copyright.gov/registration/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ExternalLink className="h-3 w-3" /> U.S. Copyright Office
      </a>
    </Card>
  );
}
