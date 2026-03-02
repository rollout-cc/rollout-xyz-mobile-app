import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import rolloutLogo from "@/assets/rollout-logo.png";

export default function ApproveSplit() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [entry, setEntry] = useState<any>(null);
  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [song, setSong] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [actionDone, setActionDone] = useState<"approved" | "rejected" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  const loadData = async () => {
    // Fetch the entry by token
    const { data: entryData } = await supabase
      .from("split_entries")
      .select("*, contributor:split_contributors(*)")
      .eq("approval_token", token!)
      .single();

    if (!entryData) { setLoading(false); return; }
    setEntry(entryData);

    if (entryData.approval_status !== "pending") {
      setActionDone(entryData.approval_status as any);
    }

    // Fetch song
    const { data: songData } = await supabase
      .from("split_songs")
      .select("*")
      .eq("id", entryData.song_id)
      .single();
    setSong(songData);

    if (songData) {
      // Fetch project
      const { data: projData } = await supabase
        .from("split_projects")
        .select("*, artist:artists(name)")
        .eq("id", songData.project_id)
        .single();
      setProject(projData);

      // Fetch all entries for this song
      const { data: allEntriesData } = await supabase
        .from("split_entries")
        .select("*, contributor:split_contributors(*)")
        .eq("song_id", songData.id)
        .order("created_at");
      setAllEntries(allEntriesData || []);
    }

    setLoading(false);
  };

  const handleAction = async (status: "approved" | "rejected") => {
    if (!entry) return;
    setSubmitting(true);
    await supabase
      .from("split_entries")
      .update({ approval_status: status, approved_at: new Date().toISOString() })
      .eq("approval_token", token!);
    setActionDone(status);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <img src={rolloutLogo} alt="Rollout" className="h-8" />
        <p className="text-muted-foreground">This approval link is invalid or has expired.</p>
      </div>
    );
  }

  const artistName = (project as any)?.artist?.name ?? "Unknown Artist";

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <img src={rolloutLogo} alt="Rollout" className="h-8 mx-auto" />
          <h1 className="text-xl font-bold mt-4">Split Approval</h1>
          <p className="text-muted-foreground text-sm">
            {artistName} — {project?.name} — "{song?.title}"
          </p>
        </div>

        {/* All contributors table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium">Contributor</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium text-center">Master %</th>
                <th className="px-3 py-2 font-medium text-center">Prod %</th>
                <th className="px-3 py-2 font-medium text-center">Writer %</th>
                <th className="px-3 py-2 font-medium">PRO</th>
              </tr>
            </thead>
            <tbody>
              {allEntries.map((e: any) => {
                const isMe = e.id === entry.id;
                return (
                  <tr key={e.id} className={isMe ? "bg-primary/5 font-semibold" : ""}>
                    <td className="px-3 py-2">
                      {e.contributor?.name ?? "—"}
                      {isMe && <span className="ml-1 text-xs text-primary">(you)</span>}
                    </td>
                    <td className="px-3 py-2 capitalize">{e.role?.replace("_", " ")}</td>
                    <td className="px-3 py-2 text-center">{e.master_pct != null ? `${e.master_pct}%` : "—"}</td>
                    <td className="px-3 py-2 text-center">{e.producer_pct != null ? `${e.producer_pct}%` : "—"}</td>
                    <td className="px-3 py-2 text-center">{e.writer_pct != null ? `${e.writer_pct}%` : "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{e.contributor?.pro_affiliation ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Action area */}
        {actionDone ? (
          <div className={`text-center py-6 rounded-lg border ${actionDone === "approved" ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5"}`}>
            {actionDone === "approved" ? (
              <>
                <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
                <p className="font-semibold">Approved</p>
                <p className="text-sm text-muted-foreground">Your split has been confirmed.</p>
              </>
            ) : (
              <>
                <XCircle className="h-10 w-10 mx-auto text-destructive mb-2" />
                <p className="font-semibold">Declined</p>
                <p className="text-sm text-muted-foreground">You've declined this split.</p>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 justify-center">
            <Button
              size="lg"
              onClick={() => handleAction("approved")}
              disabled={submitting}
              className="gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Approve
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleAction("rejected")}
              disabled={submitting}
              className="gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Decline
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
