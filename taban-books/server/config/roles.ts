/**
 * System Roles Configuration
 * Defines all user roles in the system
 */

/**
 * Available roles in Taban Books
 */
export const ROLES = {
  OWNER: "owner",                    // Company owner (full access)
  ADMIN: "admin",                    // Administrator (full access except billing)
  ACCOUNTANT: "accountant",          // Accountant (financial access)
  MANAGER: "manager",                // Manager (supervisory access)
  STAFF: "staff",                    // Staff (limited access)
  STAFF_ASSIGNED: "staff_assigned",  // Staff with assigned customers only
  TIMESHEET_STAFF: "timesheet_staff", // Timesheet staff (time tracking only)
  VIEWER: "viewer",                  // Viewer (read-only access)
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/**
 * Role hierarchy (higher number = more permissions)
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [ROLES.OWNER]: 8,
  [ROLES.ADMIN]: 7,
  [ROLES.ACCOUNTANT]: 6,
  [ROLES.MANAGER]: 5,
  [ROLES.STAFF]: 4,
  [ROLES.STAFF_ASSIGNED]: 3,
  [ROLES.TIMESHEET_STAFF]: 2,
  [ROLES.VIEWER]: 1,
};

/**
 * Get role hierarchy level
 * @param role - Role name
 * @returns Hierarchy level
 */
export function getRoleLevel(role: string): number {
  return ROLE_HIERARCHY[role as Role] || 0;
}

/**
 * Check if role1 has higher or equal permissions than role2
 * @param role1 - First role
 * @param role2 - Second role
 * @returns True if role1 has higher or equal permissions
 */
export function hasHigherOrEqualRole(role1: string, role2: string): boolean {
  return getRoleLevel(role1) >= getRoleLevel(role2);
}

/**
 * All available roles as array
 */
export const ALL_ROLES: Role[] = Object.values(ROLES);

/**
 * Default role for new users
 */
export const DEFAULT_ROLE: Role = ROLES.STAFF;

export default {
  ROLES,
  ROLE_HIERARCHY,
  getRoleLevel,
  hasHigherOrEqualRole,
  ALL_ROLES,
  DEFAULT_ROLE,
};

