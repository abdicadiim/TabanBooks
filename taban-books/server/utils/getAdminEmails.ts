/**
 * Get Admin/Owner Emails Utility
 * Returns list of admin and owner emails for an organization
 */

import User from "../models/User.js";
import Organization from "../models/Organization.js";

export interface AdminEmailInfo {
  email: string;
  name: string;
  role: string;
}

/**
 * Get admin and owner emails for an organization
 * @param organizationId - Organization ID
 * @returns Array of admin email info
 */
export const getAdminEmails = async (organizationId: string): Promise<AdminEmailInfo[]> => {
  try {
    // Find all active users with owner or admin role
    const adminUsers = await User.find({
      organization: organizationId,
      role: { $in: ['owner', 'admin'] },
      isActive: true,
    }).select('email name role').lean();

    if (!adminUsers || adminUsers.length === 0) {
      // Fallback: try to get organization email
      const organization = await Organization.findById(organizationId).lean();
      if (organization && (organization as any).email) {
        return [{
          email: (organization as any).email,
          name: organization.name,
          role: 'organization',
        }];
      }
      
      console.warn(`[REORDER POINT] No admin/owner users found for organization ${organizationId}`);
      return [];
    }

    return adminUsers.map(user => ({
      email: user.email,
      name: user.name,
      role: user.role,
    }));
  } catch (error: any) {
    console.error(`[REORDER POINT] Error fetching admin emails for organization ${organizationId}:`, error);
    return [];
  }
};
