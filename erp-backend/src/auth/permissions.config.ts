// ============================================================
// SISTEMA DE PERMISOS RBAC - CONFIGURACIÓN CENTRALIZADA
// ============================================================
// 
// Este archivo es la ÚNICA fuente de verdad para permisos.
// 
// ROLES:
// - 'admin': Puede gestionar casi todo excepto acciones críticas de owner
// - 'member': Puede ver settings básicos
// 
// OWNER:
// - El owner (workspace.owner_id) se comporta como admin pero tiene
//   permisos adicionales definidos en OWNER_ONLY_PERMISSIONS
//
// ============================================================

// Todos los permisos disponibles en el sistema
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
  MEMBERS_REMOVE_ADMIN: 'members:remove:admin',  // Solo owner puede expulsar admins
  MEMBERS_ROLE_CHANGE: 'members:role:change',
  MEMBERS_ROLE_CHANGE_TO_ADMIN: 'members:role:change:admin', // Solo owner puede hacer admin
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Roles disponibles (solo 2, owner es un estado, no un rol)
export type Role = 'admin' | 'member';

// Permisos que SOLO el owner puede tener (ni siquiera los admin)
export const OWNER_ONLY_PERMISSIONS: Permission[] = [
  PERMISSIONS.WORKSPACE_DELETE,
  PERMISSIONS.WORKSPACE_TRANSFER_OWNERSHIP,
  PERMISSIONS.MEMBERS_REMOVE_ADMIN,
  PERMISSIONS.MEMBERS_ROLE_CHANGE_TO_ADMIN,
];

// Configuración de roles y sus permisos
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
  ],
  
  member: [
    // Workspace - solo lectura
    PERMISSIONS.WORKSPACE_SETTINGS_READ,
    // NOTA: BILLING_READ es solo para admin/owner
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
    description: 'Gestiona miembros y facturación',
  },
  member: {
    name: 'Miembro',
    description: 'Acceso básico al workspace, sin acceso a configuración crítica o facturación',
  },
};

// ============================================================
// FUNCIONES AYUDANTES
// ============================================================

/**
 * Verifica si un rol tiene un permiso específico
 */
export function roleHasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes(permission);
}

/**
 * Verifica si un usuario (con rol e isOwner) tiene un permiso específico
 */
export function userHasPermission(
  role: Role, 
  isOwner: boolean, 
  permission: Permission
): boolean {
  if (isOwner) return true;
  if (OWNER_ONLY_PERMISSIONS.includes(permission)) {
    return false;
  }
  return roleHasPermission(role, permission);
}

/**
 * Obtiene todos los permisos efectivos de un usuario
 */
export function getUserPermissions(role: Role, isOwner: boolean): Permission[] {
  if (isOwner) {
    return Object.values(PERMISSIONS);
  }
  return [...ROLE_PERMISSIONS[role]];
}

/**
 * Obtiene todos los permisos de un rol (sin considerar owner)
 */
export function getRolePermissions(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

/**
 * Lista todos los roles disponibles
 */
export function getAvailableRoles(): Role[] {
  return Object.keys(ROLE_PERMISSIONS) as Role[];
}

/**
 * Valida si un string es un rol válido
 */
export function isValidRole(role: string): role is Role {
  return role in ROLE_PERMISSIONS;
}

/**
 * Obtiene el display role para UI
 */
export function getDisplayRole(role: Role, isOwner: boolean): 'owner' | Role {
  if (isOwner) return 'owner';
  return role;
}
