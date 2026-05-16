// ============================================================
// SISTEMA DE PERMISOS RBAC - FRONTEND
// ============================================================
// 
// Este archivo debe mantenerse sincronizado con:
// donclaw-backend/src/auth/permissions.config.ts
//
// ROLES:
// - 'admin': Puede gestionar casi todo excepto acciones críticas de owner
// - 'member': Puede gestionar sus propias instancias
// 
// OWNER:
// - El owner (workspace.owner_id) se comporta como admin pero tiene
//   permisos adicionales definidos en OWNER_ONLY_PERMISSIONS
// - En la UI se muestra como "Propietario" pero funcionalmente es admin+
//
// ============================================================

// Todos los permisos disponibles (debe coincidir con backend)
export const PERMISSIONS = {
  // Workspace
  WORKSPACE_SETTINGS_READ: 'workspace:settings:read',
  WORKSPACE_SETTINGS_WRITE: 'workspace:settings:write',
  WORKSPACE_DELETE: 'workspace:delete',
  WORKSPACE_TRANSFER_OWNERSHIP: 'workspace:transfer:ownership',
  
  // Billing
  BILLING_READ: 'billing:read',
  BILLING_WRITE: 'billing:write',
  
  // Members
  MEMBERS_INVITE: 'members:invite',
  MEMBERS_REMOVE: 'members:remove',
  MEMBERS_REMOVE_ADMIN: 'members:remove:admin',
  MEMBERS_ROLE_CHANGE: 'members:role:change',
  MEMBERS_ROLE_CHANGE_TO_ADMIN: 'members:role:change:admin',
  
  // Instances
  INSTANCE_CREATE: 'instance:create',
  INSTANCE_READ_ANY: 'instance:read:any',
  INSTANCE_READ_OWN: 'instance:read:own',
  INSTANCE_UPDATE_ANY: 'instance:update:any',
  INSTANCE_UPDATE_OWN: 'instance:update:own',
  INSTANCE_DELETE_ANY: 'instance:delete:any',
  INSTANCE_DELETE_OWN: 'instance:delete:own',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Roles disponibles (solo 2, owner es un estado, no un rol)
export type Role = 'admin' | 'member';

// Permisos que SOLO el owner puede tener
export const OWNER_ONLY_PERMISSIONS: Permission[] = [
  PERMISSIONS.WORKSPACE_DELETE,
  PERMISSIONS.WORKSPACE_TRANSFER_OWNERSHIP,
  PERMISSIONS.MEMBERS_REMOVE_ADMIN,
  PERMISSIONS.MEMBERS_ROLE_CHANGE_TO_ADMIN,
];

// Configuración de roles y sus permisos (debe coincidir con backend)
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    // Workspace
    PERMISSIONS.WORKSPACE_SETTINGS_READ,
    PERMISSIONS.WORKSPACE_SETTINGS_WRITE,
    // NOTA: WORKSPACE_DELETE es solo para owner
    
    // Billing
    PERMISSIONS.BILLING_READ,
    PERMISSIONS.BILLING_WRITE,
    
    // Members
    PERMISSIONS.MEMBERS_INVITE,
    PERMISSIONS.MEMBERS_REMOVE,
    // NOTA: MEMBERS_REMOVE_ADMIN es solo para owner
    PERMISSIONS.MEMBERS_ROLE_CHANGE,
    // NOTA: MEMBERS_ROLE_CHANGE_TO_ADMIN es solo para owner
    
    // Instances
    PERMISSIONS.INSTANCE_CREATE,
    PERMISSIONS.INSTANCE_READ_ANY,
    PERMISSIONS.INSTANCE_UPDATE_ANY,
    PERMISSIONS.INSTANCE_DELETE_ANY,
  ],
  
  member: [
    PERMISSIONS.WORKSPACE_SETTINGS_READ,
    PERMISSIONS.BILLING_READ,
    PERMISSIONS.INSTANCE_CREATE,
    PERMISSIONS.INSTANCE_READ_OWN,
    PERMISSIONS.INSTANCE_UPDATE_OWN,
    PERMISSIONS.INSTANCE_DELETE_OWN,
  ],
};

// Descripciones de roles para UI
export const ROLE_DESCRIPTIONS: Record<Role | 'owner', { name: string; description: string }> = {
  owner: {
    name: 'Propietario',
    description: 'Control total del workspace, puede eliminarlo y transferirlo',
  },
  admin: {
    name: 'Administrador',
    description: 'Gestiona miembros, billing e instancias',
  },
  member: {
    name: 'Miembro',
    description: 'Crea y gestiona tus propias instancias',
  },
};

// ============================================================
// FUNCIONES AYUDANTES
// ============================================================

/**
 * Verifica si un rol tiene un permiso específico
 * NOTA: El owner debe verificarse por separado, siempre tiene todos los permisos
 */
export function roleHasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes(permission);
}

/**
 * Verifica si un usuario (con rol e isOwner) tiene un permiso específico
 * Esta es la función recomendada para usar en la mayoría de casos
 */
export function userHasPermission(
  role: Role, 
  isOwner: boolean, 
  permission: Permission
): boolean {
  // Owner siempre tiene todos los permisos
  if (isOwner) return true;
  
  // Revisar si el permiso es solo para owner
  if (OWNER_ONLY_PERMISSIONS.includes(permission)) {
    return false;
  }
  
  // Revisar permisos del rol
  return roleHasPermission(role, permission);
}

/**
 * Obtiene el display role para UI
 * En la UI mostramos 'owner' como un rol separado aunque internamente sea admin
 */
export function getDisplayRole(role: Role, isOwner: boolean): 'owner' | Role {
  if (isOwner) return 'owner';
  return role;
}

/**
 * Verifica si un usuario puede realizar una acción en una instancia
 * 
 * REGLAS:
 * - Owner y admin pueden todo
 * - Member solo puede sus propias instancias (si tiene permisos :own)
 */
export function canManageInstance(
  userRole: Role,
  isOwner: boolean,
  instanceOwnerId: string | null,
  currentUserId: string,
  action: 'read' | 'update' | 'delete'
): boolean {
  // Owner y admin pueden todo
  if (isOwner || userRole === 'admin') return true;
  
  // Member revisa permisos :own
  const permissionMap = {
    read: PERMISSIONS.INSTANCE_READ_OWN,
    update: PERMISSIONS.INSTANCE_UPDATE_OWN,
    delete: PERMISSIONS.INSTANCE_DELETE_OWN,
  };
  
  if (!roleHasPermission(userRole, permissionMap[action])) {
    return false;
  }
  
  // Verificar ownership (por ahora siempre true para members)
  // En el futuro podemos comparar instanceOwnerId === currentUserId
  return true;
}

/**
 * Obtiene el badge color para un rol
 */
export function getRoleBadgeVariant(role: Role | 'owner'): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (role) {
    case 'owner':
      return 'default'; // primary
    case 'admin':
      return 'secondary';
    case 'member':
      return 'outline';
    default:
      return 'outline';
  }
}

/**
 * Lista todos los roles disponibles para invitación
 * (owner no es invitable, se determina por ownership)
 */
export function getInvitableRoles(): Role[] {
  return ['admin', 'member'];
}

/**
 * Valida si un string es un rol válido
 */
export function isValidRole(role: string): role is Role {
  return role === 'admin' || role === 'member';
}
