import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parse } from "date-fns";
import rolloutLogo from "@/assets/rollout-logo.png";

export default function PublicTimeline() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["public_timeline", token],
    queryFn: async () => {
      // Find the artist by timeline token
      const { data: artist, error: aErr } = await (supabase as any)
        .from("artists")
        .select("id, name, timeline_public_token, timeline_is_public")
        .eq("timeline_public_token", token)
        .eq("timeline_is_public", true)
        .single();
      if (aErr) throw aErr;

      // Get milestones
      const { data: milestones, error: mErr } = await supabase
        .from("artist_milestones")
        .select("*")
        .eq("artist_id", artist.id)
        .order("date", { ascending: true });
      if (mErr) throw mErr;

      return { artist, milestones };
    },
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        This timeline is not available or has been disabled.
      </div>
    );
  }

  const { artist, milestones } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <img src={rolloutLogo} alt="Rollout" className="h-6 invert dark:invert-0" />
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-8">
          {artist.name}
          <span className="text-muted-foreground font-normal"> › Timeline</span>
        </h1>

        {milestones.length === 0 ? (
          <p className="text-muted-foreground">No key dates yet.</p>
        ) : (
          <div className="space-y-0">
            {milestones.map((m: any) => {
              const date = parse(m.date, "yyyy-MM-dd", new Date());
              return (
                <div
                  key={m.id}
                  className="flex items-start gap-0 border-b border-border last:border-b-0"
                >
                  {/* Date */}
                  <div className="w-[160px] shrink-0 py-5 pr-6 border-r border-border">
                    <div className="font-semibold text-sm">{format(date, "MMMM d, yyyy")}</div>
                    <div className="text-xs text-muted-foreground">{format(date, "EEEE")}</div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 py-5 pl-6">
                    <div className="font-semibold text-sm">{m.title}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {m.description || <span className="italic">No description</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
