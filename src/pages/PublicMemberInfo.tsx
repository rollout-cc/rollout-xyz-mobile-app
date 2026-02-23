import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User, Plane, Shirt } from "lucide-react";
import { format, parse } from "date-fns";

export default function PublicMemberInfo() {
  const { token } = useParams<{ token: string }>();

  const { data: member, isLoading, error } = useQuery({
    queryKey: ["public_member", token],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("artist_travel_info")
        .select("*")
        .eq("public_token", token)
        .eq("is_public", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  if (isLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (error || !member) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">This link is not available or has been disabled.</div>;

  const firstName = member.first_name || member.member_name || "";
  const lastName = member.last_name || "";
  const displayName = `${firstName} ${lastName}`.trim() || "Member Info";

  return (
    <div className="min-h-screen bg-background p-6 sm:p-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">{displayName}</h1>

        {/* Personal Info */}
        <Section icon={<User className="h-4 w-4" />} title="Personal Info">
          <InfoGrid>
            <InfoItem label="First Name" value={member.first_name} />
            <InfoItem label="Last Name" value={member.last_name} />
            <InfoItem label="Date of Birth" value={member.date_of_birth ? format(parse(member.date_of_birth, "yyyy-MM-dd", new Date()), "PPP") : null} />
          </InfoGrid>
        </Section>

        {/* Travel Info */}
        <Section icon={<Plane className="h-4 w-4" />} title="Travel Info">
          <InfoGrid>
            <InfoItem label="KTN Number" value={member.ktn_number} />
            <InfoItem label="TSA PreCheck Number" value={member.tsa_precheck_number} />
            <InfoItem label="Preferred Seat" value={member.preferred_seat} />
            <InfoItem label="Preferred Airline" value={member.preferred_airline} />
            <InfoItem label="Passport Name" value={member.passport_name} />
            <InfoItem label="Dietary Restrictions" value={member.dietary_restrictions} />
          </InfoGrid>
          {member.notes && <InfoItem label="Notes" value={member.notes} className="mt-3" />}
        </Section>

        {/* Clothing */}
        <Section icon={<Shirt className="h-4 w-4" />} title="Clothing">
          <InfoGrid>
            <InfoItem label="Shirt Size" value={member.shirt_size} />
            <InfoItem label="Pants Size" value={member.pant_size} />
            <InfoItem label="Shoe Size" value={member.shoe_size} />
            <InfoItem label="Dress Size" value={member.dress_size} />
            <InfoItem label="Hat Size" value={member.hat_size} />
          </InfoGrid>
          {member.favorite_brands && <InfoItem label="Favorite Brands" value={member.favorite_brands} className="mt-3" />}
        </Section>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">{children}</div>;
}

function InfoItem({ label, value, className = "" }: { label: string; value: string | null; className?: string }) {
  if (!value) return null;
  return (
    <div className={className}>
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className="text-foreground">{value}</p>
    </div>
  );
}
