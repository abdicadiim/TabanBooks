/**
 * Reorder Point Notification Utility
 * Handles checking and sending reorder point notifications
 */

import Item from "../models/Item.js";
import Organization from "../models/Organization.js";
import { getItemsSettings } from "./itemsSettings.js";
import { getAdminEmails } from "./getAdminEmails.js";
import { sendReorderPointEmail } from "../services/email.service.js";

// Track items that have already been notified to avoid duplicate emails
// Key: organizationId:itemId, Value: timestamp
const notifiedItems = new Map<string, number>();

// Clear old notifications (older than 24 hours) to allow re-notification
const NOTIFICATION_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

const getReorderPointRecipients = async (
  organizationId: string,
  configuredEmail?: string
): Promise<string[]> => {
  const normalizedConfiguredEmail = String(configuredEmail || "").trim().toLowerCase();
  if (normalizedConfiguredEmail) {
    return [normalizedConfiguredEmail];
  }

  const adminEmails = await getAdminEmails(organizationId);
  return adminEmails
    .map((admin) => String(admin.email || "").trim().toLowerCase())
    .filter(Boolean);
};

/**
 * Check and send reorder point notification for an item
 * @param organizationId - Organization ID
 * @param itemId - Item ID
 * @param newStock - New stock quantity after update
 */
export const checkAndNotifyReorderPoint = async (
  organizationId: string,
  itemId: string,
  newStock: number
): Promise<void> => {
  try {
    // Get items settings
    const settings = await getItemsSettings(organizationId);

    // If reorder point notification is disabled, skip
    if (!settings.notifyReorderPoint) {
      return;
    }

    // Get item details
    const item = await Item.findById(itemId).lean();
    if (!item) {
      return;
    }

    // Check if item has reorder point set
    const reorderPoint = item.reorderPoint || item.reorderLevel || 0;
    if (reorderPoint === 0) {
      return;
    }

    // Check if stock is at or below reorder point
    if (newStock > reorderPoint) {
      // Stock is above reorder point, clear notification if exists
      const notificationKey = `${organizationId}:${itemId}`;
      notifiedItems.delete(notificationKey);
      return;
    }

    // Check if we've already notified for this item recently
    const notificationKey = `${organizationId}:${itemId}`;
    const lastNotified = notifiedItems.get(notificationKey);
    const now = Date.now();

    if (lastNotified && (now - lastNotified) < NOTIFICATION_COOLDOWN) {
      // Already notified recently, skip
      return;
    }

    // Get organization name
    const organization = await Organization.findById(organizationId).lean();
    const organizationName = organization?.name || 'Your Organization';

    const emailRecipients = await getReorderPointRecipients(
      organizationId,
      settings.notifyReorderPointEmail
    );
    if (emailRecipients.length === 0) {
      console.warn(`[REORDER POINT] No recipient email found for organization ${organizationId}`);
      return;
    }

    // Prepare email data
    const itemsData = [{
      name: item.name,
      sku: item.sku,
      quantityLeft: newStock,
      reorderPoint: reorderPoint,
    }];

    // Send email
    try {
      await sendReorderPointEmail({
        to: emailRecipients,
        organizationName,
        organizationId,
        items: itemsData,
      });

      // Mark as notified
      notifiedItems.set(notificationKey, now);

      console.log(`✅ Reorder point notification sent for item "${item.name}" (Stock: ${newStock}, Reorder Point: ${reorderPoint})`);
    } catch (emailError: any) {
      console.error(`❌ Error sending reorder point email for item ${item.name}:`, emailError);
      // Don't throw, just log the error
    }
  } catch (error: any) {
    console.error(`[REORDER POINT] Error checking reorder point for item ${itemId}:`, error);
    // Don't throw, just log the error
  }
};

/**
 * Batch check multiple items for reorder point
 * Useful when multiple items are updated at once
 */
export const checkAndNotifyReorderPointBatch = async (
  organizationId: string,
  items: Array<{ itemId: string; newStock: number }>
): Promise<void> => {
  try {
    // Get items settings
    const settings = await getItemsSettings(organizationId);

    // If reorder point notification is disabled, skip
    if (!settings.notifyReorderPoint) {
      return;
    }

    // Filter items that need notification
    const itemsToNotify: Array<{ itemId: string; newStock: number }> = [];

    for (const itemData of items) {
      const item = await Item.findById(itemData.itemId).lean();
      if (!item) continue;

      const reorderPoint = item.reorderPoint || item.reorderLevel || 0;
      if (reorderPoint === 0) continue;

      if (itemData.newStock <= reorderPoint) {
        // Check if we've already notified recently
        const notificationKey = `${organizationId}:${itemData.itemId}`;
        const lastNotified = notifiedItems.get(notificationKey);
        const now = Date.now();

        if (!lastNotified || (now - lastNotified) >= NOTIFICATION_COOLDOWN) {
          itemsToNotify.push(itemData);
        }
      }
    }

    if (itemsToNotify.length === 0) {
      return;
    }

    // Get organization name
    const organization = await Organization.findById(organizationId).lean();
    const organizationName = organization?.name || 'Your Organization';

    const emailRecipients = await getReorderPointRecipients(
      organizationId,
      settings.notifyReorderPointEmail
    );
    if (emailRecipients.length === 0) {
      console.warn(`[REORDER POINT] No recipient email found for organization ${organizationId}`);
      return;
    }

    // Fetch item details for email
    const itemsData = await Promise.all(
      itemsToNotify.map(async (itemData) => {
        const item = await Item.findById(itemData.itemId).lean();
        if (!item) return null;

        const reorderPoint = item.reorderPoint || item.reorderLevel || 0;
        return {
          name: item.name,
          sku: item.sku,
          quantityLeft: itemData.newStock,
          reorderPoint: reorderPoint,
        };
      })
    );

    const validItemsData = itemsData.filter(item => item !== null) as Array<{
      name: string;
      sku?: string;
      quantityLeft: number;
      reorderPoint: number;
    }>;

    if (validItemsData.length === 0) {
      return;
    }

    // Send email
    try {
      await sendReorderPointEmail({
        to: emailRecipients,
        organizationName,
        organizationId,
        items: validItemsData,
      });

      // Mark all as notified
      const now = Date.now();
      itemsToNotify.forEach(itemData => {
        const notificationKey = `${organizationId}:${itemData.itemId}`;
        notifiedItems.set(notificationKey, now);
      });

      console.log(`✅ Reorder point notification sent for ${validItemsData.length} item(s)`);
    } catch (emailError: any) {
      console.error(`❌ Error sending batch reorder point email:`, emailError);
    }
  } catch (error: any) {
    console.error(`[REORDER POINT] Error in batch reorder point check:`, error);
  }
};
