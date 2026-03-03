import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Projects ──
export function useSplitProjects(artistId: string | undefined) {
  return useQuery({
    queryKey: ["split-projects", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("split_projects")
        .select("*")
        .eq("artist_id", artistId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!artistId,
  });
}

export function useCreateSplitProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { artist_id: string; name: string; project_type: string }) => {
      const { data, error } = await supabase.from("split_projects").insert(p).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["split-projects", d.artist_id] }),
  });
}

export function useDeleteSplitProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, artistId }: { id: string; artistId: string }) => {
      const { error } = await supabase.from("split_projects").delete().eq("id", id);
      if (error) throw error;
      return artistId;
    },
    onSuccess: (artistId) => qc.invalidateQueries({ queryKey: ["split-projects", artistId] }),
  });
}

// ── Songs ──
export function useSplitSongs(projectId: string | undefined) {
  return useQuery({
    queryKey: ["split-songs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("split_songs")
        .select("*")
        .eq("project_id", projectId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useCreateSplitSong() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: { project_id: string; title: string }) => {
      const { data, error } = await supabase.from("split_songs").insert(s).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["split-songs", d.project_id] }),
  });
}

export function useDeleteSplitSong() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("split_songs").delete().eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => qc.invalidateQueries({ queryKey: ["split-songs", projectId] }),
  });
}

// ── Contributors (team-wide) ──
export function useSplitContributors(teamId: string | null) {
  return useQuery({
    queryKey: ["split-contributors", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("split_contributors")
        .select("*")
        .eq("team_id", teamId!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });
}

export function useUpsertSplitContributor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: {
      id?: string;
      team_id: string;
      name: string;
      email?: string | null;
      phone?: string | null;
      pro_affiliation?: string | null;
      ipi_number?: string | null;
      pub_ipi_number?: string | null;
    }) => {
      if (c.id) {
        const { data, error } = await supabase.from("split_contributors").update(c).eq("id", c.id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from("split_contributors").insert(c).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["split-contributors", d.team_id] }),
  });
}

// ── Entries ──
export function useSplitEntries(songId: string | undefined) {
  return useQuery({
    queryKey: ["split-entries", songId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("split_entries")
        .select("*, contributor:split_contributors(*)")
        .eq("song_id", songId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!songId,
  });
}

export function useCreateSplitEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: { song_id: string; contributor_id: string; role?: string }) => {
      const { data, error } = await supabase.from("split_entries").insert(e).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["split-entries", d.song_id] }),
  });
}

export function useUpdateSplitEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, songId, ...patch }: { id: string; songId: string; [key: string]: any }) => {
      const { error } = await supabase.from("split_entries").update(patch).eq("id", id);
      if (error) throw error;
      return songId;
    },
    onSuccess: (songId) => qc.invalidateQueries({ queryKey: ["split-entries", songId] }),
  });
}

export function useDeleteSplitEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, songId }: { id: string; songId: string }) => {
      const { error } = await supabase.from("split_entries").delete().eq("id", id);
      if (error) throw error;
      return songId;
    },
    onSuccess: (songId) => qc.invalidateQueries({ queryKey: ["split-entries", songId] }),
  });
}

// ── Batch create (wizard) ──
interface WizardContributor {
  name: string;
  contributorId?: string;
  role: string;
  pct?: string;
  songIndices: number[];
}

interface WizardSong {
  title: string;
  contributors: WizardContributor[];
}

export function useCreateSplitBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      artistId,
      teamId,
      releaseType,
      releaseName,
      songs,
    }: {
      artistId: string;
      teamId: string;
      releaseType: string;
      releaseName: string;
      songs: WizardSong[];
    }) => {
      // 1. Create project
      const { data: project, error: pErr } = await supabase
        .from("split_projects")
        .insert({ artist_id: artistId, name: releaseName, project_type: releaseType })
        .select()
        .single();
      if (pErr) throw pErr;

      // 2. Create songs
      const songInserts = songs.map((s, i) => ({
        project_id: project.id,
        title: s.title,
        sort_order: i,
      }));
      const { data: dbSongs, error: sErr } = await supabase
        .from("split_songs")
        .insert(songInserts)
        .select()
        .order("sort_order", { ascending: true });
      if (sErr) throw sErr;

      // 3. Resolve contributors (create new ones, reuse existing ids)
      const nameToId = new Map<string, string>();
      const allContribs = songs.flatMap((s) => s.contributors);
      const uniqueNames = [...new Set(allContribs.map((c) => c.name.toLowerCase()))];

      for (const c of allContribs) {
        if (c.contributorId) {
          nameToId.set(c.name.toLowerCase(), c.contributorId);
        }
      }

      // Insert new contributors
      for (const name of uniqueNames) {
        if (!nameToId.has(name)) {
          const original = allContribs.find((c) => c.name.toLowerCase() === name)!;
          const { data: newC, error: cErr } = await supabase
            .from("split_contributors")
            .insert({ team_id: teamId, name: original.name })
            .select()
            .single();
          if (cErr) throw cErr;
          nameToId.set(name, newC.id);
        }
      }

      // 4. Create entries
      const entries: {
        song_id: string;
        contributor_id: string;
        role: string;
        producer_pct?: number;
        writer_pct?: number;
      }[] = [];

      songs.forEach((song, songIdx) => {
        const dbSongId = dbSongs[songIdx].id;
        song.contributors.forEach((c) => {
          // This contributor should be on this song if songIdx is in songIndices
          if (!c.songIndices.includes(songIdx)) return;
          const contribId = nameToId.get(c.name.toLowerCase());
          if (!contribId) return;

          const entry: any = {
            song_id: dbSongId,
            contributor_id: contribId,
            role: c.role === "producer" ? "producer" : c.role === "writer" ? "songwriter" : "performer",
          };
          if (c.pct) {
            if (c.role === "producer") entry.producer_pct = parseFloat(c.pct);
            else if (c.role === "writer") entry.writer_pct = parseFloat(c.pct);
          }
          entries.push(entry);
        });
      });

      if (entries.length > 0) {
        const { error: eErr } = await supabase.from("split_entries").insert(entries);
        if (eErr) throw eErr;
      }

      return project;
    },
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ["split-projects", project.artist_id] });
      qc.invalidateQueries({ queryKey: ["split-contributors"] });
    },
  });
}
