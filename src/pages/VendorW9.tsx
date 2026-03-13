import { useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";

const TAX_CLASSIFICATIONS = [
  { value: "individual", label: "Individual/sole proprietor or single-member LLC" },
  { value: "c_corp", label: "C Corporation" },
  { value: "s_corp", label: "S Corporation" },
  { value: "partnership", label: "Partnership" },
  { value: "trust_estate", label: "Trust/estate" },
  { value: "llc", label: "Limited liability company (LLC)" },
  { value: "other", label: "Other" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
];

export default function VendorW9() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Step 1: Identity
  const [legalName, setLegalName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [taxClass, setTaxClass] = useState("");
  const [llcClass, setLlcClass] = useState("");

  // Step 2: Exemptions & Address
  const [exemptPayeeCode, setExemptPayeeCode] = useState("");
  const [fatcaCode, setFatcaCode] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  // Step 3: TIN
  const [tinType, setTinType] = useState("ssn");
  const [tin, setTin] = useState("");

  // Step 4: Payment
  const [paymentMethod, setPaymentMethod] = useState("check");
  const [bankRouting, setBankRouting] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [venmoHandle, setVenmoHandle] = useState("");

  // Step 5: Certification
  const [certified, setCertified] = useState(false);
  const [signatureName, setSignatureName] = useState("");

  const canProceed = (s: number) => {
    if (s === 1) return legalName.trim() && taxClass;
    if (s === 2) return address1.trim() && city.trim() && state && zip.trim();
    if (s === 3) return tin.replace(/[^0-9]/g, "").length >= 9;
    if (s === 4) {
      if (paymentMethod === "bank_transfer") return bankRouting.trim() && bankAccount.trim();
      if (paymentMethod === "paypal") return paypalEmail.trim();
      if (paymentMethod === "venmo") return venmoHandle.trim();
      return true;
    }
    if (s === 5) return certified && signatureName.trim();
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-vendor-w9", {
        body: {
          token,
          legal_name: legalName,
          business_name: businessName || null,
          federal_tax_classification: taxClass,
          llc_classification: taxClass === "llc" ? llcClass : null,
          exempt_payee_code: exemptPayeeCode || null,
          fatca_exemption_code: fatcaCode || null,
          address_line1: address1,
          address_line2: address2 || null,
          city,
          state,
          zip,
          tin_type: tinType,
          tin: tin.replace(/[^0-9]/g, ""),
          signature_name: signatureName,
          payment_method: paymentMethod,
          bank_routing: bankRouting || null,
          bank_account: bankAccount || null,
          paypal_email: paypalEmail || null,
          venmo_handle: venmoHandle || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
          <h1 className="text-2xl font-bold">W-9 Submitted</h1>
          <p className="text-muted-foreground">Your tax information and payment details have been securely submitted. You can close this page.</p>
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
          <h1 className="text-xl font-bold">W-9 Tax Information</h1>
          <p className="text-sm text-muted-foreground mt-1">Request for Taxpayer Identification Number and Certification</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-8">
          {[1,2,3,4,5].map(s => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <div className="space-y-6">
          {/* Step 1: Identity */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Taxpayer Information</h2>
              <div>
                <Label>Name (as shown on your income tax return) *</Label>
                <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Legal name" />
              </div>
              <div>
                <Label>Business name / disregarded entity name (if different)</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Business name" />
              </div>
              <div>
                <Label>Federal tax classification *</Label>
                <Select value={taxClass} onValueChange={setTaxClass}>
                  <SelectTrigger><SelectValue placeholder="Select classification" /></SelectTrigger>
                  <SelectContent>
                    {TAX_CLASSIFICATIONS.map(tc => <SelectItem key={tc.value} value={tc.value}>{tc.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {taxClass === "llc" && (
                <div>
                  <Label>LLC tax classification</Label>
                  <Select value={llcClass} onValueChange={setLlcClass}>
                    <SelectTrigger><SelectValue placeholder="Select LLC classification" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="C">C — C corporation</SelectItem>
                      <SelectItem value="S">S — S corporation</SelectItem>
                      <SelectItem value="P">P — Partnership</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Address & Exemptions */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Address & Exemptions</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Exempt payee code (if any)</Label>
                  <Input value={exemptPayeeCode} onChange={(e) => setExemptPayeeCode(e.target.value)} placeholder="Code" />
                </div>
                <div>
                  <Label>FATCA exemption code (if any)</Label>
                  <Input value={fatcaCode} onChange={(e) => setFatcaCode(e.target.value)} placeholder="Code" />
                </div>
              </div>
              <div>
                <Label>Address *</Label>
                <Input value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="Street address" />
              </div>
              <div>
                <Label>Address line 2</Label>
                <Input value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="Apt, suite, etc." />
              </div>
              <div className="grid grid-cols-6 gap-3">
                <div className="col-span-3">
                  <Label>City *</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                </div>
                <div className="col-span-1">
                  <Label>State *</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger><SelectValue placeholder="ST" /></SelectTrigger>
                    <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>ZIP *</Label>
                  <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP code" />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: TIN */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Taxpayer Identification Number (TIN)</h2>
              <p className="text-sm text-muted-foreground">Enter your Social Security Number (SSN) or Employer Identification Number (EIN).</p>
              <RadioGroup value={tinType} onValueChange={setTinType} className="flex gap-4">
                <div className="flex items-center gap-2"><RadioGroupItem value="ssn" id="ssn" /><Label htmlFor="ssn">SSN</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="ein" id="ein" /><Label htmlFor="ein">EIN</Label></div>
              </RadioGroup>
              <div>
                <Label>{tinType === "ssn" ? "Social Security Number" : "Employer Identification Number"} *</Label>
                <Input
                  type="password"
                  value={tin}
                  onChange={(e) => setTin(e.target.value)}
                  placeholder={tinType === "ssn" ? "XXX-XX-XXXX" : "XX-XXXXXXX"}
                  maxLength={11}
                />
                <p className="text-xs text-muted-foreground mt-1">This information is encrypted and stored securely.</p>
              </div>
            </div>
          )}

          {/* Step 4: Payment */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Payment Details</h2>
              <p className="text-sm text-muted-foreground">How would you like to receive payment?</p>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
                <div className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/30">
                  <RadioGroupItem value="bank_transfer" id="bank" /><Label htmlFor="bank" className="flex-1 cursor-pointer">Bank Transfer (ACH)</Label>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/30">
                  <RadioGroupItem value="paypal" id="paypal" /><Label htmlFor="paypal" className="flex-1 cursor-pointer">PayPal</Label>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/30">
                  <RadioGroupItem value="venmo" id="venmo" /><Label htmlFor="venmo" className="flex-1 cursor-pointer">Venmo</Label>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/30">
                  <RadioGroupItem value="check" id="check" /><Label htmlFor="check" className="flex-1 cursor-pointer">Check (mailed to address above)</Label>
                </div>
              </RadioGroup>
              {paymentMethod === "bank_transfer" && (
                <div className="space-y-3 pl-2 border-l-2 border-border ml-4">
                  <div><Label>Routing Number *</Label><Input value={bankRouting} onChange={(e) => setBankRouting(e.target.value)} placeholder="9-digit routing number" maxLength={9} /></div>
                  <div><Label>Account Number *</Label><Input type="password" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="Account number" /></div>
                </div>
              )}
              {paymentMethod === "paypal" && (
                <div className="pl-2 border-l-2 border-border ml-4">
                  <Label>PayPal Email *</Label>
                  <Input type="email" value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} placeholder="paypal@email.com" />
                </div>
              )}
              {paymentMethod === "venmo" && (
                <div className="pl-2 border-l-2 border-border ml-4">
                  <Label>Venmo Handle *</Label>
                  <Input value={venmoHandle} onChange={(e) => setVenmoHandle(e.target.value)} placeholder="@username" />
                </div>
              )}
            </div>
          )}

          {/* Step 5: Certification */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Certification</h2>
              <div className="rounded-lg border border-border p-4 bg-muted/30 text-xs leading-relaxed text-muted-foreground space-y-2">
                <p>Under penalties of perjury, I certify that:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>The number shown on this form is my correct taxpayer identification number (or I am waiting for a number to be issued to me); and</li>
                  <li>I am not subject to backup withholding because: (a) I am exempt from backup withholding, or (b) I have not been notified by the Internal Revenue Service (IRS) that I am subject to backup withholding as a result of a failure to report all interest or dividends, or (c) the IRS has notified me that I am no longer subject to backup withholding; and</li>
                  <li>I am a U.S. citizen or other U.S. person (defined in IRS W-9 instructions); and</li>
                  <li>The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting is correct.</li>
                </ol>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                <Checkbox id="certify" checked={certified} onCheckedChange={(v) => setCertified(v as boolean)} />
                <Label htmlFor="certify" className="text-sm cursor-pointer leading-snug">I certify, under penalties of perjury, that the information provided is true, correct, and complete.</Label>
              </div>
              <div>
                <Label>Electronic Signature (type your full name) *</Label>
                <Input value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="Your full legal name" />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />Back
              </Button>
            ) : <div />}
            {step < 5 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed(step)} className="gap-1.5">
                Continue<ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canProceed(5) || submitting} className="gap-1.5">
                {submitting ? "Submitting..." : "Submit W-9"}
              </Button>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-12">
          Your information is encrypted and transmitted securely via <a href="https://rollout.cc" className="underline">Rollout</a>.
        </p>
      </div>
    </div>
  );
}
