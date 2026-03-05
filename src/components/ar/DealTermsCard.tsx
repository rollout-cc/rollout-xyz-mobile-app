import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DealTermsCardProps {
  deal: any;
  onUpdate: (field: string, value: any) => void;
}

function updateTerms(deal: any, key: string, value: any, onUpdate: (f: string, v: any) => void) {
  const terms = { ...(deal.type_specific_terms || {}), [key]: value };
  onUpdate("type_specific_terms", terms);
}

function formatDollar(val: string): string {
  const digits = val.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
}

function TermField({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: any; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-sm text-muted-foreground">{label}</Label>
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

function DollarField({ label, value, onChange, placeholder }: {
  label: string; value: any; onChange: (v: string) => void; placeholder?: string;
}) {
  const [display, setDisplay] = useState(() => value ? formatDollar(String(value)) : "");

  return (
    <div>
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
        <Input
          value={display}
          onChange={(e) => {
            setDisplay(formatDollar(e.target.value));
          }}
          onBlur={() => {
            const raw = display.replace(/[^0-9]/g, "");
            onChange(raw || "");
          }}
          placeholder={placeholder}
          className="h-8 text-sm pl-6"
        />
      </div>
    </div>
  );
}

function TermSelect({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-sm text-muted-foreground">{label}</Label>
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
  const hasAdvance = deal.advance != null && deal.advance !== "";

  const commonFields = (
    <>
      <TermSelect label="Term Length" value={deal.term_length || ""} options={["1 Year", "2 Years", "3 Years", "4 Years", "5 Years", "7 Years", "10 Years"]} onChange={(v) => onUpdate("term_length", v)} />
      <TermSelect label="Territory" value={deal.territory || "Worldwide"} options={["Worldwide", "North America", "US Only", "UK/EU", "Custom"]} onChange={(v) => onUpdate("territory", v)} />
      <TermSelect label="Accounting Frequency" value={deal.accounting_frequency || "Quarterly"} options={["Monthly", "Quarterly", "Semi Annual"]} onChange={(v) => onUpdate("accounting_frequency", v)} />
      <TermSelect label="Advance" value={hasAdvance ? "Yes" : "No"} options={["Yes", "No"]} onChange={(v) => { if (v === "No") onUpdate("advance", null); else onUpdate("advance", 0); }} />
      {hasAdvance && (
        <DollarField label="Advance Amount" value={deal.advance?.toString()} onChange={(v) => onUpdate("advance", v ? parseFloat(v) : null)} placeholder="0" />
      )}
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
            <TermField label="Distributor Fee %" value={terms.distributor_fee_pct} onChange={(v) => ut("distributor_fee_pct", v)} type="number" placeholder="15" />
            <TermField label="Returns Reserve %" value={terms.returns_reserve_pct} onChange={(v) => ut("returns_reserve_pct", v)} type="number" placeholder="20" />
            <TermSelect label="Audit Right" value={terms.audit_right || "Yes"} options={["Yes", "No"]} onChange={(v) => ut("audit_right", v)} />
          </>
        )}

        {deal.deal_type === "frontline_record" && (
          <>
            <TermSelect label="Albums" value={terms.albums || ""} options={["1", "2", "3", "3+"]} onChange={(v) => ut("albums", v)} />
            <TermSelect label="Options" value={terms.options || ""} options={["0", "1", "2", "3"]} onChange={(v) => ut("options", v)} />
            <TermSelect label="Masters Ownership" value={terms.masters_ownership || ""} options={["Label Owns", "Artist Owns", "Joint"]} onChange={(v) => ut("masters_ownership", v)} />
            <TermField label="Royalty Rate %" value={terms.royalty_rate} onChange={(v) => ut("royalty_rate", v)} type="number" placeholder="15" />
            <TermSelect label="Recoupment" value={terms.recoupment || ""} options={["Yes", "No"]} onChange={(v) => ut("recoupment", v)} />
            <DollarField label="Marketing Amount" value={terms.marketing_amount} onChange={(v) => ut("marketing_amount", v)} placeholder="0" />
            <DollarField label="Recording Amount" value={terms.recording_amount} onChange={(v) => ut("recording_amount", v)} placeholder="0" />
            <TermSelect label="Creative Control" value={terms.creative_control || ""} options={["Label", "Shared", "Artist"]} onChange={(v) => ut("creative_control", v)} />
          </>
        )}

        {deal.deal_type === "partnership" && (
          <>
            <TermSelect label="Profit Split" value={terms.profit_split || ""} options={["50/50", "60/40", "70/30", "Custom"]} onChange={(v) => ut("profit_split", v)} />
            <TermSelect label="Masters Ownership" value={terms.masters_ownership || ""} options={["Artist", "Label", "Joint"]} onChange={(v) => ut("masters_ownership", v)} />
            <TermSelect label="Who Pays Costs" value={terms.who_pays_costs || ""} options={["Label", "Artist", "Shared"]} onChange={(v) => ut("who_pays_costs", v)} />
            <TermSelect label="Recoupment" value={terms.recoupment || ""} options={["Yes", "No"]} onChange={(v) => ut("recoupment", v)} />
            <DollarField label="Marketing Amount" value={terms.marketing_amount} onChange={(v) => ut("marketing_amount", v)} placeholder="0" />
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

        {deal.deal_type === "management" && (
          <>
            <TermField label="Commission Rate %" value={terms.commission_rate} onChange={(v) => ut("commission_rate", v)} type="number" placeholder="15" />
            <TermSelect label="Commission Base" value={terms.commission_base || ""} options={["Gross Income", "Net Income", "Adjusted Gross"]} onChange={(v) => ut("commission_base", v)} />
            <TermSelect label="Scope of Services" value={terms.scope || ""} options={["All Entertainment", "Music Only", "Music + Touring", "Music + Acting", "Custom"]} onChange={(v) => ut("scope", v)} />
            <TermSelect label="Exclusivity" value={terms.exclusivity || ""} options={["Exclusive", "Non Exclusive"]} onChange={(v) => ut("exclusivity", v)} />
            <TermSelect label="Key Person" value={terms.key_person || ""} options={["Yes", "No"]} onChange={(v) => ut("key_person", v)} />
            <TermSelect label="Power of Attorney" value={terms.power_of_attorney || ""} options={["Yes", "No", "Limited"]} onChange={(v) => ut("power_of_attorney", v)} />
            <TermSelect label="Sunset Clause" value={terms.sunset_clause || ""} options={["Yes", "No"]} onChange={(v) => ut("sunset_clause", v)} />
            {terms.sunset_clause === "Yes" && (
              <>
                <TermSelect label="Sunset Period" value={terms.sunset_period || ""} options={["1 Year", "2 Years", "3 Years", "5 Years"]} onChange={(v) => ut("sunset_period", v)} />
                <TermSelect label="Sunset Rate Decline" value={terms.sunset_decline || ""} options={["Full Rate", "75% → 50%", "50% → 25%", "Sliding Scale", "Custom"]} onChange={(v) => ut("sunset_decline", v)} />
              </>
            )}
            <TermSelect label="Commission on Touring" value={terms.touring_commission || ""} options={["Full Rate", "Reduced Rate", "Excluded"]} onChange={(v) => ut("touring_commission", v)} />
            {terms.touring_commission === "Reduced Rate" && (
              <TermField label="Touring Rate %" value={terms.touring_rate} onChange={(v) => ut("touring_rate", v)} type="number" placeholder="10" />
            )}
            <TermSelect label="Commission on Merch" value={terms.merch_commission || ""} options={["Full Rate", "Reduced Rate", "Excluded"]} onChange={(v) => ut("merch_commission", v)} />
            <TermSelect label="Commission on Songwriting" value={terms.songwriting_commission || ""} options={["Full Rate", "Reduced Rate", "Excluded"]} onChange={(v) => ut("songwriting_commission", v)} />
            <TermSelect label="Commission on Sync" value={terms.sync_commission || ""} options={["Full Rate", "Reduced Rate", "Excluded"]} onChange={(v) => ut("sync_commission", v)} />
            <TermSelect label="Termination Notice" value={terms.termination_notice || ""} options={["30 Days", "60 Days", "90 Days"]} onChange={(v) => ut("termination_notice", v)} />
            <TermSelect label="Performance Clause" value={terms.performance_clause || ""} options={["None", "Revenue Minimum", "Activity Minimum", "Custom"]} onChange={(v) => ut("performance_clause", v)} />
            {terms.performance_clause && terms.performance_clause !== "None" && (
              <TermField label="Performance Threshold" value={terms.performance_threshold} onChange={(v) => ut("performance_threshold", v)} placeholder="Describe threshold..." />
            )}
          </>
        )}
      </div>

      <div className="mt-3">
        <Label className="text-xs text-muted-foreground">Deal Notes</Label>
        <RichTextEditor
          value={deal.notes || ""}
          onBlur={(v) => { if (v !== (deal.notes || "")) onUpdate("notes", v); }}
          placeholder="Additional deal notes..."
        />
      </div>
    </div>
  );
}
