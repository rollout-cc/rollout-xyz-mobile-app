import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bug, Settings, CheckCircle2, XCircle, Clock, RefreshCw, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const REPO_OWNER = "rollout-cc";
const REPO_NAME = "rollout-xyz-mobile-app";
const REFRESH_INTERVAL = 60 * 60 * 1000; // 60 minutes

interface BugItem {
  file: string;
  line?: number;
  severity: string;
  description: string;
  suggestion: string;
}

type BugStatus = "pending" | "committed" | "dismissed";

const severityColor: Record<string, string> = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

export function BugDashboard() {
  const [bugs, setBugs] = useState<BugItem[]>([]);
  const [statuses, setStatuses] = useState<Record<number, BugStatus>>({});
  const [loading, setLoading] = useState(false);
  const [busyIdx, setBusyIdx] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [ghToken, setGhToken] = useState(() => localStorage.getItem("github_token") || "");
  const [anthropicKey, setAnthropicKey] = useState(() => localStorage.getItem("anthropic_api_key") || "");
  const [showGhToken, setShowGhToken] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);

  const saveSettings = () => {
    localStorage.setItem("github_token", ghToken);
    localStorage.setItem("anthropic_api_key", anthropicKey);
    toast.success("Keys saved to localStorage");
    setShowSettings(false);
  };

  const fetchBugs = useCallback(async () => {
    const token = localStorage.getItem("github_token");
    if (!token) { toast.error("GitHub token not configured"); return; }

    setLoading(true);
    try {
      // 1. List recent artifacts
      const artRes = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/artifacts?per_page=5`,
        { headers: { Authorization: `token ${token}`, Accept: "application/vnd.github+json" } }
      );
      if (!artRes.ok) throw new Error(`GitHub API error: ${artRes.status}`);
      const artData = await artRes.json();
      const artifact = artData.artifacts?.find((a: any) => a.name === "bug-report");
      if (!artifact) { toast.error("No bug-report artifact found"); setLoading(false); return; }

      // 2. Download zip
      const dlRes = await fetch(artifact.archive_download_url, {
        headers: { Authorization: `token ${token}`, Accept: "application/vnd.github+json" },
      });
      if (!dlRes.ok) throw new Error(`Download failed: ${dlRes.status}`);
      const blob = await dlRes.blob();

      // 3. Extract JSON from zip
      const { BlobReader, ZipReader, TextWriter } = await import("@zip.js/zip.js");
      const reader = new ZipReader(new BlobReader(blob));
      const entries = await reader.getEntries();
      const jsonEntry = entries.find((e) => e.filename.endsWith(".json"));
      if (!jsonEntry || !("getData" in jsonEntry) || typeof (jsonEntry as any).getData !== "function") {
        toast.error("No JSON in artifact zip"); setLoading(false); return;
      }
      const text = await (jsonEntry as any).getData(new TextWriter()) as string;
      await reader.close();

      const parsed = JSON.parse(text);
      const bugList: BugItem[] = Array.isArray(parsed) ? parsed : parsed.bugs || parsed.results || [];
      setBugs(bugList);
      setStatuses({});
      if (bugList.length === 0) toast.info("No bugs found in latest report");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to fetch bugs");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (localStorage.getItem("github_token")) fetchBugs();
    const interval = setInterval(fetchBugs, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchBugs]);

  const approveFix = async (idx: number, bug: BugItem) => {
    const token = localStorage.getItem("github_token");
    const apiKey = localStorage.getItem("anthropic_api_key");
    if (!token || !apiKey) { toast.error("Missing GitHub token or Anthropic key"); return; }

    setBusyIdx(idx);
    try {
      // 1. Fetch current file content from GitHub
      const fileRes = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${bug.file}`,
        { headers: { Authorization: `token ${token}`, Accept: "application/vnd.github+json" } }
      );
      if (!fileRes.ok) throw new Error(`Could not fetch file: ${fileRes.status}`);
      const fileData = await fileRes.json();
      const currentContent = atob(fileData.content.replace(/\n/g, ""));

      // 2. Ask Claude for the corrected code
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [{
            role: "user",
            content: `Fix this bug in the file "${bug.file}".\n\nBug description: ${bug.description}\nSuggested fix: ${bug.suggestion}\n${bug.line ? `Line number: ${bug.line}` : ""}\n\nHere is the current file content:\n\`\`\`\n${currentContent}\n\`\`\`\n\nReturn ONLY the complete corrected file content with no explanation, no markdown fences, no extra text. Just the raw code.`,
          }],
        }),
      });
      if (!claudeRes.ok) {
        const errBody = await claudeRes.text();
        throw new Error(`Claude API error: ${claudeRes.status} – ${errBody}`);
      }
      const claudeData = await claudeRes.json();
      const fixedContent = claudeData.content?.[0]?.text;
      if (!fixedContent) throw new Error("Empty response from Claude");

      // 3. Commit fix to GitHub
      const commitRes = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${bug.file}`,
        {
          method: "PUT",
          headers: { Authorization: `token ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `fix: ${bug.description.slice(0, 72)}`,
            content: btoa(unescape(encodeURIComponent(fixedContent))),
            sha: fileData.sha,
          }),
        }
      );
      if (!commitRes.ok) throw new Error(`Commit failed: ${commitRes.status}`);

      setStatuses((prev) => ({ ...prev, [idx]: "committed" }));
      toast.success(`Fix committed for ${bug.file}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to apply fix");
    }
    setBusyIdx(null);
  };

  const dismiss = (idx: number) => {
    setStatuses((prev) => ({ ...prev, [idx]: "dismissed" }));
  };

  const statusBadge = (idx: number) => {
    const s = statuses[idx] || "pending";
    if (s === "committed") return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Committed</Badge>;
    if (s === "dismissed") return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> Dismissed</Badge>;
    return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Bug className="h-5 w-5" /> Bug Scanner Dashboard</CardTitle>
            <CardDescription>AI-detected bugs from the latest GitHub Actions scan</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={fetchBugs} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showSettings && (
          <div className="rounded-lg border border-border p-4 bg-muted/30 space-y-3">
            <p className="text-sm font-medium">API Keys (stored in localStorage)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>GitHub Token</Label>
                <div className="relative">
                  <Input
                    type={showGhToken ? "text" : "password"}
                    value={ghToken}
                    onChange={(e) => setGhToken(e.target.value)}
                    placeholder="ghp_…"
                  />
                  <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-10 w-10" onClick={() => setShowGhToken(!showGhToken)}>
                    {showGhToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label>Anthropic API Key</Label>
                <div className="relative">
                  <Input
                    type={showAnthropicKey ? "text" : "password"}
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    placeholder="sk-ant-…"
                  />
                  <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-10 w-10" onClick={() => setShowAnthropicKey(!showAnthropicKey)}>
                    {showAnthropicKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
            <Button size="sm" onClick={saveSettings}>Save Keys</Button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading bug report…</p>
        ) : bugs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No bugs loaded. Click Refresh or configure your GitHub token.</p>
        ) : (
          <div className="space-y-3">
            {bugs.map((bug, idx) => {
              const status = statuses[idx] || "pending";
              return (
                <div key={idx} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Bug className="h-3.5 w-3.5 text-destructive shrink-0" />
                        <code className="text-sm font-medium">{bug.file}</code>
                        {bug.line && <span className="text-xs text-muted-foreground">line {bug.line}</span>}
                        <Badge variant="outline" className={`text-[10px] ${severityColor[bug.severity] || ""}`}>
                          {bug.severity}
                        </Badge>
                        {statusBadge(idx)}
                      </div>
                      <p className="text-sm text-foreground">{bug.description}</p>
                      <p className="text-xs text-muted-foreground"><span className="font-medium">Suggested fix:</span> {bug.suggestion}</p>
                    </div>
                  </div>
                  {status === "pending" && (
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => approveFix(idx, bug)}
                        disabled={busyIdx !== null}
                      >
                        {busyIdx === idx ? "Applying…" : "Approve Fix"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => dismiss(idx)}
                        disabled={busyIdx !== null}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
