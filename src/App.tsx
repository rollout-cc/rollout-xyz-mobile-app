import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useTeams } from "@/hooks/useTeams";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Roster from "./pages/Roster";
import ArtistDetail from "./pages/ArtistDetail";
import Tasks from "./pages/Tasks";
import Settings from "./pages/Settings";
import PublicMemberInfo from "./pages/PublicMemberInfo";
import Overview from "./pages/Overview";
import Agenda from "./pages/Agenda";
import MyWork from "./pages/MyWork";
import PublicTimeline from "./pages/PublicTimeline";
import JoinTeam from "./pages/JoinTeam";
import Staff from "./pages/Staff";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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

function AppRoutes() {
  usePushNotifications();
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/roster" element={<ProtectedRoute><Roster /></ProtectedRoute>} />
      <Route path="/overview" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
      <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
      <Route path="/my-work" element={<ProtectedRoute><MyWork /></ProtectedRoute>} />
      <Route path="/roster/:artistId" element={<ProtectedRoute><ArtistDetail /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/staff" element={<ProtectedRoute><Staff /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/shared/member/:token" element={<PublicMemberInfo />} />
      <Route path="/shared/timeline/:token" element={<PublicTimeline />} />
      <Route path="/join/:token" element={<JoinTeam />} />
      <Route path="/" element={<Navigate to="/roster" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
