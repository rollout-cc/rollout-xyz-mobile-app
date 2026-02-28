import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface DealTermsCardProps {
  deal: any;
  onUpdate: (field: string, value: any) => void;
}

function updateTerms(deal: any, key: string, value: any, onUpdate: (f: string, v: any) => void) {
  const terms = { ...(deal.type_specific_terms || {}), [key]: value };
  onUpdate("type_specific_terms", terms);
}

function TermField({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: any; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        defaultValue={value || ""}
        onBlur={(e) => { if (e.target.value !== (value || "")) onChange(e.target.value); }}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
    </div>
  );
}

function TermSelect({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export function DealTermsCard({ deal, onUpdate }: DealTermsCardProps) {
  const terms = deal.type_specific_terms || {};
  const ut = (k: string, v: any) => updateTerms(deal, k, v, onUpdate);

  const commonFields = (
    <>
      <TermField label="Term Length" value={deal.term_length} onChange={(v) => onUpdate("term_length", v)} placeholder="e.g. 2 years" />
      <TermSelect label="Territory" value={deal.territory || "Worldwide"} options={["Worldwide", "North America", "US Only", "UK/EU", "Custom"]} onChange={(v) => onUpdate("territory", v)} />
      <TermSelect label="Accounting Frequency" value={deal.accounting_frequency || "Quarterly"} options={["Monthly", "Quarterly", "Semi Annual"]} onChange={(v) => onUpdate("accounting_frequency", v)} />
      <TermField label="Advance" value={deal.advance?.toString()} onChange={(v) => onUpdate("advance", v ? parseFloat(v) : null)} type="number" placeholder="$0" />
    </>
  );

  return (
    <div className="rounded-xl border border-border p-4">
      <h4 className="text-sm font-semibold mb-3 capitalize">{deal.deal_type?.replace(/_/g, " ")} Terms</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {commonFields}

        {deal.deal_type === "distribution" && (
          <>
            <TermSelect label="Exclusivity" value={terms.exclusivity || ""} options={["Exclusive", "Non Exclusive"]} onChange={(v) => ut("exclusivity", v)} />
            <TermSelect label="Scope" value={terms.scope || ""} options={["Digital Only", "Physical Only", "Digital + Physical"]} onChange={(v) => ut("scope", v)} />
            <TermField label="Distributor Fee %" value={terms.distributor_fee_pct} onChange={(v) => ut("distributor_fee_pct", v)} type="number" placeholder="15" />
            <TermField label="Returns Reserve %" value={terms.returns_reserve_pct} onChange={(v) => ut("returns_reserve_pct", v)} type="number" placeholder="20" />
            <TermSelect label="Audit Right" value={terms.audit_right || "Yes"} options={["Yes", "No"]} onChange={(v) => ut("audit_right", v)} />
          </>
        )}

        {deal.deal_type === "frontline_record" && (
          <>
            <TermField label="Albums" value={terms.albums} onChange={(v) => ut("albums", v)} placeholder="1, 2, 3+" />
            <TermField label="Options" value={terms.options} onChange={(v) => ut("options", v)} placeholder="0, 1, 2, 3" />
            <TermSelect label="Masters Ownership" value={terms.masters_ownership || ""} options={["Label Owns", "Artist Owns", "Joint"]} onChange={(v) => ut("masters_ownership", v)} />
            <TermField label="Royalty Rate %" value={terms.royalty_rate} onChange={(v) => ut("royalty_rate", v)} type="number" placeholder="15" />
            <TermSelect label="Recoupment" value={terms.recoupment || ""} options={["Yes", "No"]} onChange={(v) => ut("recoupment", v)} />
            <TermSelect label="Marketing" value={terms.marketing_commitment || ""} options={["None", "Light", "Standard", "Aggressive"]} onChange={(v) => ut("marketing_commitment", v)} />
            <TermSelect label="Creative Control" value={terms.creative_control || ""} options={["Label", "Shared", "Artist"]} onChange={(v) => ut("creative_control", v)} />
          </>
        )}

        {deal.deal_type === "partnership" && (
          <>
            <TermSelect label="Profit Split" value={terms.profit_split || ""} options={["50/50", "60/40", "70/30", "Custom"]} onChange={(v) => ut("profit_split", v)} />
            <TermSelect label="Masters Ownership" value={terms.masters_ownership || ""} options={["Artist", "Label", "Joint"]} onChange={(v) => ut("masters_ownership", v)} />
            <TermSelect label="Who Pays Costs" value={terms.who_pays_costs || ""} options={["Label", "Artist", "Shared"]} onChange={(v) => ut("who_pays_costs", v)} />
            <TermSelect label="Recoupment" value={terms.recoupment || ""} options={["Yes", "No"]} onChange={(v) => ut("recoupment", v)} />
            <TermSelect label="Marketing" value={terms.marketing_commitment || ""} options={["None", "Light", "Standard", "Aggressive"]} onChange={(v) => ut("marketing_commitment", v)} />
          </>
        )}

        {deal.deal_type === "publishing" && (
          <>
            <TermSelect label="Pub Deal Type" value={terms.pub_deal_type || ""} options={["Admin", "Co Pub", "Full Pub"]} onChange={(v) => ut("pub_deal_type", v)} />
            <TermField label="Publisher Share %" value={terms.publisher_share} onChange={(v) => ut("publisher_share", v)} type="number" placeholder="50" />
            <TermField label="Writer Share %" value={terms.writer_share} onChange={(v) => ut("writer_share", v)} type="number" placeholder="50" />
            <TermField label="Admin Fee %" value={terms.admin_fee} onChange={(v) => ut("admin_fee", v)} type="number" placeholder="10" />
            <TermSelect label="Sync Control" value={terms.sync_control || ""} options={["Publisher", "Shared", "Writer"]} onChange={(v) => ut("sync_control", v)} />
          </>
        )}
      </div>

      <div className="mt-3">
        <Label className="text-xs text-muted-foreground">Deal Notes</Label>
        <Textarea
          defaultValue={deal.notes || ""}
          onBlur={(e) => { if (e.target.value !== (deal.notes || "")) onUpdate("notes", e.target.value); }}
          placeholder="Additional deal notes..."
          rows={3}
        />
      </div>
    </div>
  );
}
