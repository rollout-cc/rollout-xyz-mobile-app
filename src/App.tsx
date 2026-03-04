import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TeamProvider } from "@/contexts/TeamContext";
import { useTeams } from "@/hooks/useTeams";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy-loaded pages
const Login = React.lazy(() => import("./pages/Login"));
const Onboarding = React.lazy(() => import("./pages/Onboarding"));
const Roster = React.lazy(() => import("./pages/Roster"));
const ArtistDetail = React.lazy(() => import("./pages/ArtistDetail"));
const Tasks = React.lazy(() => import("./pages/Tasks"));
const Settings = React.lazy(() => import("./pages/Settings"));
const PublicMemberInfo = React.lazy(() => import("./pages/PublicMemberInfo"));
const Overview = React.lazy(() => import("./pages/Overview"));
const MyWork = React.lazy(() => import("./pages/MyWork"));
const PublicTimeline = React.lazy(() => import("./pages/PublicTimeline"));
const PublicAgenda = React.lazy(() => import("./pages/PublicAgenda"));
const JoinTeam = React.lazy(() => import("./pages/JoinTeam"));
const Staff = React.lazy(() => import("./pages/Staff"));
const StaffDetail = React.lazy(() => import("./pages/StaffDetail"));
const ARList = React.lazy(() => import("./pages/ARList"));
const ApproveSplit = React.lazy(() => import("./pages/ApproveSplit"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-3 w-64">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { data: teams, isLoading: teamsLoading } = useTeams();
  if (loading || teamsLoading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (teams && teams.length === 0) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (user) return <Navigate to="/roster" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (user) return <Navigate to="/roster" replace />;
  window.location.href = "https://rollout.cc";
  return null;
}

function AppRoutes() {
  usePushNotifications();
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/roster" element={<ProtectedRoute><Roster /></ProtectedRoute>} />
        <Route path="/overview" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
        <Route path="/agenda" element={<Navigate to="/overview" replace />} />
        <Route path="/my-work" element={<ProtectedRoute><MyWork /></ProtectedRoute>} />
        <Route path="/roster/:artistId" element={<ProtectedRoute><ArtistDetail /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
        <Route path="/staff" element={<Navigate to="/overview" replace />} />
        <Route path="/staff/:memberId" element={<ProtectedRoute><StaffDetail /></ProtectedRoute>} />
        <Route path="/ar" element={<ProtectedRoute><ARList /></ProtectedRoute>} />
        <Route path="/ar/:prospectId" element={<Navigate to="/ar" replace />} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/shared/member/:token" element={<PublicMemberInfo />} />
        <Route path="/shared/timeline/:token" element={<PublicTimeline />} />
        <Route path="/shared/agenda/:token" element={<PublicAgenda />} />
        <Route path="/join/:token" element={<JoinTeam />} />
        <Route path="/splits/approve/:token" element={<ApproveSplit />} />
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TeamProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </TeamProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
