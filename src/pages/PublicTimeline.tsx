import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parse } from "date-fns";
import rolloutLogo from "@/assets/rollout-logo.png";

export default function PublicTimeline() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["public_timeline", token],
    queryFn: async () => {
      const { data: artist, error: aErr } = await (supabase as any)
        .from("artists")
        .select("id, name, banner_url, avatar_url, timeline_public_token, timeline_is_public")
        .eq("timeline_public_token", token)
        .eq("timeline_is_public", true)
        .single();
      if (aErr) throw aErr;

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
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <img src={rolloutLogo} alt="Rollout" className="h-6 invert dark:invert-0" />
        <Link
          to="/login"
          className="text-sm font-medium px-5 py-2 rounded-full border border-border hover:bg-accent transition-colors"
        >
          Sign In
        </Link>
      </div>

      {/* Content */}
      <div className="max-w-[820px] mx-auto px-6 py-10">
        {/* Banner */}
        {artist.banner_url && (
          <div className="rounded-xl overflow-hidden mb-6 aspect-[5/1] bg-muted">
            <img
              src={artist.banner_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Artist & Title */}
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-1">{artist.name}</p>
          <h1 className="text-2xl font-bold">Timeline</h1>
        </div>

        {/* Milestones */}
        {milestones.length === 0 ? (
          <p className="text-muted-foreground">No key dates yet.</p>
        ) : (
          <div className="space-y-4">
            {milestones.map((m: any) => {
              const date = parse(m.date, "yyyy-MM-dd", new Date());
              return (
                <div key={m.id} className="flex gap-0 items-stretch">
                  {/* Date card */}
                  <div className="w-[180px] shrink-0 rounded-l-xl bg-muted/40 border border-border border-r-0 p-5 flex flex-col justify-center">
                    <div className="font-bold text-sm">{format(date, "MMMM d, yyyy")}</div>
                    <div className="text-xs text-muted-foreground">{format(date, "EEEE")}</div>
                  </div>

                  {/* Content card */}
                  <div className="flex-1 rounded-r-xl border border-border p-5 bg-card">
                    <div className="font-semibold text-sm">{m.title}</div>
                    {m.description && (
                      <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="border-t border-border mt-16">
        <div className="max-w-[820px] mx-auto px-6 py-8 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img src={rolloutLogo} alt="Rollout" className="h-5 invert dark:invert-0" />
            <div>
              <p className="font-semibold text-sm">Grow your music business with Rollout</p>
              <p className="text-xs text-muted-foreground">
                Forward thinkers in the music industry save monthly hundreds of hours thanks to Rollout.
              </p>
            </div>
          </div>
          <Link
            to="/login"
            className="shrink-0 text-sm font-medium px-6 py-2.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            Apply
          </Link>
        </div>
      </div>
    </div>
  );
}
