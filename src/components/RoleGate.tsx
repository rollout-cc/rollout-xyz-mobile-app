import { Navigate } from "react-router-dom";
import { useSelectedTeam } from "@/contexts/TeamContext";

interface RoleGateProps {
  children: React.ReactNode;
  /** Roles allowed to view this route */
  allow: string[];
  /** Optional permission flags that also grant access (OR with role check) */
  permissions?: string[];
  /** Where to redirect if not allowed (default: role-appropriate home) */
  fallback?: string;
}

export function RoleGate({ children, allow, permissions: permissionKeys, fallback }: RoleGateProps) {
  const ctx = useSelectedTeam();
  const { role, isArtistRole, assignedArtistIds } = ctx;

  // If role hasn't loaded yet, don't block
  if (!role) return <>{children}</>;

  // Check role match
  if (allow.includes(role)) return <>{children}</>;

  // Check permission flags
  if (permissionKeys && permissionKeys.length > 0) {
    const hasPermission = permissionKeys.some((key) => (ctx as any)[key]);
    if (hasPermission) return <>{children}</>;
  }

  // Default fallback based on role
  if (fallback) return <Navigate to={fallback} replace />;

  if (isArtistRole && assignedArtistIds.length > 0) {
    return <Navigate to={`/roster/${assignedArtistIds[0]}`} replace />;
  }

  return <Navigate to="/roster" replace />;
}
