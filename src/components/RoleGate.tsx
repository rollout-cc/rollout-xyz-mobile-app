import { Navigate } from "react-router-dom";
import { useSelectedTeam } from "@/contexts/TeamContext";

interface RoleGateProps {
  children: React.ReactNode;
  /** Roles allowed to view this route */
  allow: string[];
  /** Where to redirect if not allowed (default: role-appropriate home) */
  fallback?: string;
}

export function RoleGate({ children, allow, fallback }: RoleGateProps) {
  const { role, isArtistRole, assignedArtistIds } = useSelectedTeam();

  // If role hasn't loaded yet, don't block
  if (!role) return <>{children}</>;

  if (allow.includes(role)) return <>{children}</>;

  // Default fallback based on role
  if (fallback) return <Navigate to={fallback} replace />;

  if (isArtistRole && assignedArtistIds.length > 0) {
    return <Navigate to={`/roster/${assignedArtistIds[0]}`} replace />;
  }

  return <Navigate to="/roster" replace />;
}
