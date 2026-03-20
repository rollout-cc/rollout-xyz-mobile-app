import { useState, useEffect, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTeams } from "@/hooks/useTeams";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Music,
  BarChart3,
  Users,
  Wallet,
  FileText,
  Sparkles,
  ChevronRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import rolloutLogo from "@/assets/rollout-logo.png";

/* ─── feature cards data ─── */
const FEATURES = [
  {
    icon: Music,
    title: "Artist Roster",
    desc: "Manage your full roster — bios, contacts, timelines, links, and streaming data in one place.",
    color: "hsl(var(--primary))",
  },
  {
    icon: Sparkles,
    title: "Rolly AI",
    desc: "Describe a project in plain English. Rolly builds tasks, budgets, milestones, and splits automatically.",
    color: "hsl(142 71% 45%)",
  },
  {
    icon: BarChart3,
    title: "A&R Pipeline",
    desc: "Track prospects from discovery to signing with Spotify enrichment and deal-term tracking.",
    color: "hsl(32 95% 54%)",
  },
  {
    icon: Wallet,
    title: "Company Finance",
    desc: "Unified budget tracking, expense management, invoicing, and payroll across your entire operation.",
    color: "hsl(var(--primary))",
  },
  {
    icon: FileText,
    title: "Split Sheets",
    desc: "Generate signature-ready royalty split sheets with built-in approval workflows.",
    color: "hsl(142 71% 45%)",
  },
  {
    icon: Users,
    title: "Team Management",
    desc: "Invite staff, assign permissions, and manage roles — from interns to department heads.",
    color: "hsl(32 95% 54%)",
  },
];

/* ─── rotating status words ─── */
const STATUS_WORDS = [
  "REVIEWING",
  "PREPARING",
  "CONFIGURING",
  "BUILDING",
  "SETTING UP",
];

/* ─── typewriter hook ─── */
function useTypewriter(text: string, speed = 40) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (index >= text.length) return;
    const t = setTimeout(() => setIndex((i) => i + 1), speed);
    return () => clearTimeout(t);
  }, [index, text, speed]);
  return text.slice(0, index);
}

/* ─── Feature card ─── */
function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[0];
  index: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 600 + index * 120);
    return () => clearTimeout(t);
  }, [index]);

  const Icon = feature.icon;
  return (
    <div
      className="group rounded-xl border border-border bg-card p-5 transition-all duration-500 ease-out hover:shadow-lg hover:-translate-y-0.5"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? "translateY(0) scale(1)"
          : "translateY(16px) scale(0.97)",
        filter: visible ? "blur(0px)" : "blur(4px)",
        transitionDelay: `${index * 80}ms`,
      }}
    >
      <div
        className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${feature.color}10` }}
      >
        <Icon className="h-4.5 w-4.5" style={{ color: feature.color }} />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">
        {feature.title}
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {feature.desc}
      </p>
    </div>
  );
}

/* ─── Rotating status badge ─── */
function StatusBadge() {
  const [wordIdx, setWordIdx] = useState(0);
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const durations = { in: 350, hold: 1800, out: 350 };
    const t = setTimeout(() => {
      if (phase === "in") setPhase("hold");
      else if (phase === "hold") setPhase("out");
      else {
        setWordIdx((i) => (i + 1) % STATUS_WORDS.length);
        setPhase("in");
      }
    }, durations[phase]);
    return () => clearTimeout(t);
  }, [phase, wordIdx]);

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 border border-primary/10 px-4 py-2">
      <div className="relative h-2 w-2">
        <span className="absolute inset-0 rounded-full bg-warning animate-ping opacity-75" />
        <span className="relative block h-2 w-2 rounded-full bg-warning" />
      </div>
      <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Application Pending
      </span>
      <span className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground/60 uppercase overflow-hidden h-3.5">
        <span
          className="block transition-all duration-300 ease-out"
          style={{
            transform:
              phase === "out" ? "translateY(-100%)" : "translateY(0)",
            opacity: phase === "out" ? 0 : 1,
          }}
        >
          · {STATUS_WORDS[wordIdx]}
        </span>
      </span>
    </div>
  );
}

/* ─── Progress steps ─── */
const STEPS = [
  { label: "Application submitted", done: true },
  { label: "Under review", done: false, active: true },
  { label: "Team provisioned", done: false },
  { label: "Welcome email sent", done: false },
];

function ProgressTracker() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="flex items-center gap-1 transition-all duration-700 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
      }}
    >
      {STEPS.map((step, i) => (
        <div key={step.label} className="flex items-center gap-1">
          <div className="flex items-center gap-1.5">
            {step.done ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" style={{ color: "hsl(142 71% 45%)" }} />
            ) : step.active ? (
              <Clock className="h-3.5 w-3.5 text-warning shrink-0 animate-pulse" />
            ) : (
              <div className="h-3.5 w-3.5 rounded-full border border-border shrink-0" />
            )}
            <span
              className={`text-[11px] font-medium whitespace-nowrap ${
                step.done
                  ? "text-foreground"
                  : step.active
                  ? "text-foreground"
                  : "text-muted-foreground/50"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <ChevronRight className="h-3 w-3 text-border mx-0.5 shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Main page ─── */
export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: teams, isLoading: teamsLoading } = useTeams();

  const { data: application, isLoading: appLoading } = useQuery({
    queryKey: ["my-application", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("team_applications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (!teamsLoading && teams && teams.length > 0) {
    return <Navigate to="/roster" replace />;
  }

  const isLoading = teamsLoading || appLoading;
  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!application) {
    return <Navigate to="/login?mode=signup" replace />;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const heading = useTypewriter("Welcome to\nRollout.", 55);
  const showCursor = heading.length < "Welcome to\nRollout.".length;

  return (
    <div className="min-h-dvh bg-background overflow-y-auto">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <img src={rolloutLogo} alt="Rollout" className="h-7" />
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5 text-muted-foreground hover:text-foreground">
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </Button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-14">
        {/* Hero section */}
        <section className="space-y-6">
          <StatusBadge />

          <h1
            className="text-[clamp(2rem,5vw,3.5rem)] font-black leading-[0.92] tracking-tighter text-foreground whitespace-pre-line"
          >
            {heading}
            {showCursor && (
              <span className="inline-block w-[3px] h-[0.75em] bg-foreground ml-1 animate-pulse align-baseline" />
            )}
          </h1>

          <p className="text-base text-muted-foreground max-w-lg leading-relaxed">
            Your application is being reviewed by our team. We'll set up your
            workspace and send a welcome email to{" "}
            <span className="font-medium text-foreground">
              {application.email}
            </span>{" "}
            once everything is ready.
          </p>

          <ProgressTracker />
        </section>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Feature showcase */}
        <section className="space-y-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-[0.15em] uppercase text-muted-foreground">
              While you wait
            </p>
            <h2 className="text-xl font-bold text-foreground">
              Here's what you'll get access to
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} feature={f} index={i} />
            ))}
          </div>
        </section>

        {/* Rolly spotlight */}
        <section className="relative rounded-2xl bg-primary text-primary-foreground p-8 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }} />
          <div className="relative space-y-4 max-w-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-bold tracking-wide uppercase">
                Meet Rolly
              </span>
            </div>
            <h3 className="text-2xl font-black tracking-tight leading-tight">
              Your AI-powered<br />music business co-pilot.
            </h3>
            <p className="text-sm opacity-80 leading-relaxed">
              Tell Rolly what you're working on — a single release, a tour, a
              brand partnership — and it'll generate tasks, budgets, timelines,
              and split sheets for you. No templates. No busywork. Just describe
              your project and let Rolly handle the rest.
            </p>
          </div>
        </section>

        {/* Bottom note */}
        <section className="text-center pb-8 space-y-2">
          <p className="text-sm text-muted-foreground">
            Questions? Reach out to{" "}
            <a
              href="mailto:support@rollout.cc"
              className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
            >
              support@rollout.cc
            </a>
          </p>
          <p className="text-xs text-muted-foreground/60">
            Most applications are reviewed within 24 hours.
          </p>
        </section>
      </main>
    </div>
  );
}
