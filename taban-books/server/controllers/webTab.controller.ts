import { Request, Response } from 'express';
import WebTab from '../models/WebTab.js';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
    email?: string;
  };
}

// URL validation function
const isValidUrl = (url: string): boolean => {
  try {
    // Add protocol if missing
    let formattedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      formattedUrl = 'https://' + url;
    }

    const urlPattern = /^(https?:\/\/)?((([a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,})|localhost|(\d{1,3}\.){3}\d{1,3})(:\d+)?(\/[^\s]*)?$/;
    return urlPattern.test(formattedUrl);
  } catch (error) {
    return false;
  }
};

// Format URL to ensure it has a protocol
const formatUrl = (url: string): string => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  return url;
};

// Get all web tabs for the current user's organization
export const getWebTabs = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.organizationId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const orgId = req.user.organizationId;

    // Filter by organization
    const webTabs = await WebTab.find({
      status: 'Active',
      organizationId: orgId
    })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: webTabs,
      message: 'Web tabs retrieved successfully'
    });
  } catch (error: any) {
    console.error('Error fetching web tabs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch web tabs',
      error: error.message
    });
  }
};

// Create a new web tab
export const createWebTab = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.organizationId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const orgId = req.user.organizationId;
    const userId = req.user.userId;

    const { name, url, isZohoApp, visibility, selectedUsersAndRoles } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tab name is required'
      });
    }

    if (!url || !url.trim()) {
      return res.status(400).json({
        success: false,
        message: 'URL is required'
      });
    }

    // URL validation
    if (!isValidUrl(url)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid URL (e.g., https://example.com or http://localhost:3000)'
      });
    }

    // Format the URL
    const formattedUrl = formatUrl(url);

    // Validate selected users and roles if visibility is 'selected'
    if (visibility === 'selected' && (!selectedUsersAndRoles || selectedUsersAndRoles.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one user or role when visibility is set to "Only Selected Users & Roles"'
      });
    }

    // Create web tab
    const webTab = new WebTab({
      name: name.trim(),
      url: formattedUrl,
      isZohoApp: isZohoApp || false,
      visibility: visibility || 'everyone',
      selectedUsersAndRoles: visibility === 'selected' ? selectedUsersAndRoles : [],
      organizationId: orgId,
      createdBy: userId,
      status: 'Active',
      lastUpdated: new Date()
    });

    await webTab.save();

    res.status(201).json({
      success: true,
      data: webTab,
      message: 'Web tab created successfully'
    });
  } catch (error: any) {
    console.error('Error creating web tab:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create web tab',
      error: error.message
    });
  }
};

// Update a web tab
export const updateWebTab = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, url, isZohoApp, visibility, selectedUsersAndRoles } = req.body;

    // Find web tab
    const webTab = await WebTab.findById(id);
    if (!webTab) {
      return res.status(404).json({
        success: false,
        message: 'Web tab not found'
      });
    }

    // Validation
    if (name && !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tab name cannot be empty'
      });
    }

    if (url && !url.trim()) {
      return res.status(400).json({
        success: false,
        message: 'URL cannot be empty'
      });
    }

    // URL validation if URL is being updated
    if (url && !isValidUrl(url)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid URL (e.g., https://example.com or http://localhost:3000)'
      });
    }

    // Update fields
    if (name) webTab.name = name.trim();
    if (url) webTab.url = formatUrl(url);
    if (isZohoApp !== undefined) webTab.isZohoApp = isZohoApp;
    if (visibility) webTab.visibility = visibility;
    if (selectedUsersAndRoles) webTab.selectedUsersAndRoles = selectedUsersAndRoles;
    webTab.lastUpdated = new Date();

    await webTab.save();

    res.json({
      success: true,
      data: webTab,
      message: 'Web tab updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating web tab:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update web tab',
      error: error.message
    });
  }
};

// Delete a web tab
export const deleteWebTab = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const webTab = await WebTab.findById(id);
    if (!webTab) {
      return res.status(404).json({
        success: false,
        message: 'Web tab not found'
      });
    }

    // Soft delete by setting status to inactive
    webTab.status = 'Inactive';
    webTab.lastUpdated = new Date();
    await webTab.save();

    res.json({
      success: true,
      message: 'Web tab deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting web tab:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete web tab',
      error: error.message
    });
  }
};
