"use client";

import { useSession } from "next-auth/react";
import { Permission, Role, userHasPermission, getDisplayRole } from "@/lib/permissions";

interface WorkspaceMember {
  user_id: string;
  role?: string;
}

interface Workspace {
  id: string;
  owner_id?: string;
  members?: WorkspaceMember[];
}

interface UsePermissionsReturn {
  // Roles
  role: Role | null;                    // Rol real de la DB: 'admin' | 'member'
  isOwner: boolean;                     // Es el propietario del workspace
  isAdmin: boolean;                     // Es admin O owner (puede gestionar)
  isMember: boolean;                    // Es cualquier tipo de miembro
  displayRole: 'owner' | 'admin' | 'member' | null;  // Para mostrar en UI
  
  // Helpers de permisos
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  
  // Atajos comunes
  canInvite: boolean;
  canRemoveMembers: boolean;
  canRemoveAdmins: boolean;             // Solo owner
  canChangeRoles: boolean;
  canPromoteToAdmin: boolean;           // Solo owner
  canManageBilling: boolean;
  canDeleteWorkspace: boolean;          // Solo owner
  canTransferOwnership: boolean;        // Solo owner
  
  // Estado
  isLoading: boolean;
}

export function usePermissions(workspace?: any): UsePermissionsReturn {
  const { data: session, status } = useSession();

  const isLoading = status === "loading";

  // Determinar el rol del usuario en el workspace
  const getRoleInfo = (): { 
    role: Role | null; 
    isOwner: boolean;
    displayRole: 'owner' | 'admin' | 'member' | null;
  } => {
    if (!session?.user?.id || !workspace) {
      return { role: null, isOwner: false, displayRole: null };
    }

    // Es owner?
    const isOwner = workspace.owner_id && workspace.owner_id === session.user.id;

    // Buscar en members
    const member = workspace.members?.find(
      (m: any) => m.user_id === session.user.id
    );

    if (isOwner) {
      // Owner funcionalmente es admin, pero se identifica como owner
      return { 
        role: 'admin', 
        isOwner: true, 
        displayRole: 'owner' 
      };
    }

    if (member && (member.role === 'admin' || member.role === 'member')) {
      return { 
        role: member.role as Role, 
        isOwner: false, 
        displayRole: member.role as Role 
      };
    }

    return { role: null, isOwner: false, displayRole: null };
  };

  const { role, isOwner, displayRole } = getRoleInfo();
  
  // Helper booleanos
  const isAdmin = isOwner || role === 'admin';
  const isMember = role !== null || isOwner;

  // Verificar un permiso específico
  const hasPermission = (permission: Permission): boolean => {
    if (!role) return false;
    return userHasPermission(role, isOwner, permission);
  };

  // Verificar si tiene alguno de varios permisos (OR)
  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some((p) => hasPermission(p));
  };

  return {
    // Roles
    role,
    isOwner,
    isAdmin,
    isMember,
    displayRole,
    
    // Helpers
    hasPermission,
    hasAnyPermission,
    
    // Atajos
    canInvite: hasPermission("members:invite" as Permission),
    canRemoveMembers: hasPermission("members:remove" as Permission),
    canRemoveAdmins: hasPermission("members:remove:admin" as Permission),
    canChangeRoles: hasPermission("members:role:change" as Permission),
    canPromoteToAdmin: hasPermission("members:role:change:admin" as Permission),
    canManageBilling: hasPermission("billing:write" as Permission),
    canDeleteWorkspace: hasPermission("workspace:delete" as Permission),
    canTransferOwnership: hasPermission("workspace:transfer:ownership" as Permission),
    
    isLoading,
  };
}
