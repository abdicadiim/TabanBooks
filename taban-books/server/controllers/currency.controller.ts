/**
 * Currency Controller
 * Handles currency management
 */

import { Request, Response } from "express";
import Currency from "../models/Currency.js";
import Organization from "../models/Organization.js";
import mongoose from "mongoose";
import {
  applyResourceVersionHeaders,
  buildResourceVersion,
  requestMatchesResourceVersion,
} from "../utils/resourceVersion.js";

interface AuthRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
  };
}

/**
 * Get all currencies
 * GET /api/settings/currencies
 */
export const getCurrencies = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const query: any = {
      organization: req.user.organizationId,
    };

    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    const [latestCurrency, currencyCount] = await Promise.all([
      Currency.findOne(query).sort({ updatedAt: -1 }).select("updatedAt code").lean(),
      Currency.countDocuments(query),
    ]);

    const versionState = buildResourceVersion("settings-currencies", [
      {
        key: "currencies",
        id: req.user.organizationId,
        updatedAt: (latestCurrency as any)?.updatedAt,
        count: currencyCount,
        extra: String(req.query.isActive ?? ""),
      },
    ]);
    applyResourceVersionHeaders(res, versionState);

    if (requestMatchesResourceVersion(req, versionState)) {
      res.status(304).end();
      return;
    }

    let currencies = await Currency.find(query).sort({ code: 1 });

    // If no currencies exist, seed default currencies
    if (currencies.length === 0) {
      const organization = await Organization.findById(req.user.organizationId).lean();
      const baseCode = (organization?.currency || "USD").toUpperCase();

      const defaultCurrencies = [
        { code: "USD", name: "United States Dollar", symbol: "$", isBaseCurrency: false },
        { code: "EUR", name: "Euro", symbol: "EUR", isBaseCurrency: false },
        { code: "GBP", name: "British Pound", symbol: "GBP", isBaseCurrency: false },
        { code: "KES", name: "Kenyan Shilling", symbol: "KSh", isBaseCurrency: false },
        { code: "SOS", name: "Somali Shilling", symbol: "SOS", isBaseCurrency: false },
        { code: "CAD", name: "Canadian Dollar", symbol: "C$", isBaseCurrency: false },
        { code: "AWG", name: "Aruban Guilder", symbol: "AWG", isBaseCurrency: false },
      ];

      const normalizedCurrencies = defaultCurrencies.map((currency) =>
        currency.code === baseCode ? { ...currency, isBaseCurrency: true } : currency
      );

      const currenciesToInsert = normalizedCurrencies.map((currency) => ({
        ...currency,
        organization: new mongoose.Types.ObjectId(req.user!.organizationId),
      }));

      currencies = await Currency.insertMany(currenciesToInsert) as any;
      console.log(`Seeded ${currencies.length} default currencies for organization ${req.user!.organizationId}`);
    }

    res.json({
      success: true,
      data: currencies,
      version_id: versionState.version_id,
      last_updated: versionState.last_updated,
    });
  } catch (error: any) {
    console.error('Error fetching currencies detailed:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch currencies',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Get base currency
 * GET /api/settings/currencies/base
 */
export const getBaseCurrency = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized: No user info' });
      return;
    }

    if (!req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized: No organization assigned' });
      return;
    }

    const query = {
      organization: req.user.organizationId,
      isBaseCurrency: true,
    };

    const baseCurrency = await Currency.findOne(query).lean();

    if (!baseCurrency) {
      const organization = await Organization.findById(req.user.organizationId).lean();
      const fallbackCode = (organization?.currency || 'USD').toUpperCase();
      const fallbackCurrency = await Currency.findOne({
        organization: req.user.organizationId,
        code: fallbackCode,
      }).lean();

      // Return organization currency if available, else fallback to USD
      res.json({
        success: true,
        data: {
          code: fallbackCurrency?.code || fallbackCode,
          symbol: fallbackCurrency?.symbol || '$',
          name: fallbackCurrency?.name || fallbackCode,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        _id: baseCurrency._id,
        code: baseCurrency.code,
        symbol: baseCurrency.symbol,
        name: baseCurrency.name,
      },
    });
  } catch (error: any) {
    console.error('CRITICAL ERROR in getBaseCurrency:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while fetching base currency',
      error: error,
      stack: error.stack
    });
  }
};

/**
 * Get single currency
 * GET /api/settings/currencies/:id
 */
export const getCurrency = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const currency = await Currency.findOne({
      _id: id,
      organization: req.user.organizationId,
    });

    if (!currency) {
      res.status(404).json({ success: false, message: 'Currency not found' });
      return;
    }

    res.json({
      success: true,
      data: currency,
    });
  } catch (error: any) {
    console.error('Error fetching currency:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch currency',
    });
  }
};

/**
 * Create currency
 * POST /api/settings/currencies
 */
export const createCurrency = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const normalizedCode = String(req.body.code || '').trim().toUpperCase();
    const normalizedName = String(req.body.name || '').trim();
    const normalizedSymbol = String(req.body.symbol || '').trim();

    if (!normalizedCode || !normalizedName) {
      res.status(400).json({
        success: false,
        message: 'Currency code and name are required.',
      });
      return;
    }

    const existingCurrency = await Currency.findOne({
      organization: req.user.organizationId,
      $or: [
        { code: normalizedCode },
        { name: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
      ],
    }).lean();

    if (existingCurrency) {
      res.status(409).json({
        success: false,
        message: `Currency ${existingCurrency.code} already exists.`,
      });
      return;
    }

    // If this is set as base currency, unset other base currencies
    if (req.body.isBaseCurrency) {
      await Currency.updateMany(
        { organization: req.user.organizationId },
        { $set: { isBaseCurrency: false } }
      );
    }

    const currency = await Currency.create({
      ...req.body,
      code: normalizedCode,
      name: normalizedName,
      symbol: normalizedSymbol || "$",
      organization: req.user.organizationId,
    });

    if (req.body.isBaseCurrency) {
      await Organization.findByIdAndUpdate(req.user.organizationId, {
        currency: currency.code,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Currency created successfully',
      data: currency,
    });
  } catch (error: any) {
    console.error('Error creating currency:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create currency',
    });
  }
};

/**
 * Update currency
 * PUT /api/settings/currencies/:id
 */
export const updateCurrency = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    console.log(`[UpdateCurrency] ID: ${id}, Body:`, req.body);

    const currentCurrency = await Currency.findOne({
      _id: id,
      organization: req.user.organizationId,
    });

    if (!currentCurrency) {
      res.status(404).json({ success: false, message: 'Currency not found' });
      return;
    }

    const normalizedCode = req.body.code !== undefined
      ? String(req.body.code).trim().toUpperCase()
      : currentCurrency.code;
    const normalizedName = req.body.name !== undefined
      ? String(req.body.name).trim()
      : currentCurrency.name;
    const normalizedSymbol = req.body.symbol !== undefined
      ? String(req.body.symbol).trim()
      : currentCurrency.symbol;

    if (currentCurrency.isBaseCurrency && normalizedCode !== currentCurrency.code) {
      res.status(400).json({
        success: false,
        message: 'Base currency code cannot be changed.',
      });
      return;
    }

    const duplicateCurrency = await Currency.findOne({
      organization: req.user.organizationId,
      _id: { $ne: id },
      $or: [
        { code: normalizedCode },
        { name: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
      ],
    }).lean();

    if (duplicateCurrency) {
      res.status(409).json({
        success: false,
        message: `Currency ${duplicateCurrency.code} already exists.`,
      });
      return;
    }

    // If this is set as base currency, unset other base currencies
    if (req.body.isBaseCurrency) {
      await Currency.updateMany(
        { organization: req.user.organizationId, _id: { $ne: id } },
        { $set: { isBaseCurrency: false } }
      );
    }

    const currency = await Currency.findOneAndUpdate(
      { _id: id, organization: req.user.organizationId },
      {
        ...req.body,
        code: normalizedCode,
        name: normalizedName,
        symbol: normalizedSymbol || "$",
      },
      { new: true, runValidators: true }
    );

    if (req.body.isBaseCurrency && currency) {
      await Organization.findByIdAndUpdate(req.user.organizationId, {
        currency: currency.code,
      });
    }

    res.json({
      success: true,
      message: 'Currency updated successfully',
      data: currency,
    });
  } catch (error: any) {
    console.error('Error updating currency:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update currency',
    });
  }
};

/**
 * Delete currency
 * DELETE /api/settings/currencies/:id
 */
export const deleteCurrency = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const currency = await Currency.findOne({
      _id: id,
      organization: req.user.organizationId,
    });

    if (!currency) {
      res.status(404).json({ success: false, message: 'Currency not found' });
      return;
    }

    if (currency.isBaseCurrency) {
      res.status(400).json({
        success: false,
        message: 'Base currency cannot be deleted.',
      });
      return;
    }

    await Currency.deleteOne({
      _id: id,
      organization: req.user.organizationId,
    });

    res.json({
      success: true,
      message: 'Currency deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting currency:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete currency',
    });
  }
};

/**
 * Add exchange rate
 * POST /api/settings/currencies/:id/exchange-rates
 */
export const addExchangeRate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { date, rate } = req.body;
    const normalizedRate = Number(rate);

    if (!Number.isFinite(normalizedRate) || normalizedRate <= 0) {
      res.status(400).json({
        success: false,
        message: 'Exchange rate must be greater than 0.',
      });
      return;
    }

    const normalizedDate = date ? new Date(date) : new Date();
    if (Number.isNaN(normalizedDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid exchange rate date.',
      });
      return;
    }

    const currency = await Currency.findOneAndUpdate(
      { _id: id, organization: req.user.organizationId },
      {
        $push: {
          exchangeRates: {
            date: normalizedDate,
            rate: normalizedRate,
          },
        },
      },
      { new: true }
    );

    if (!currency) {
      res.status(404).json({ success: false, message: 'Currency not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Exchange rate added successfully',
      data: currency,
    });
  } catch (error: any) {
    console.error('Error adding exchange rate:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add exchange rate',
    });
  }
};

/**
 * Delete exchange rate
 * DELETE /api/settings/currencies/:id/exchange-rates/:rateId
 */
export const deleteExchangeRate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id, rateId } = req.params;

    const currency = await Currency.findOne({
      _id: id,
      organization: req.user.organizationId,
    });

    if (!currency) {
      res.status(404).json({ success: false, message: 'Currency not found' });
      return;
    }

    const existingRate = currency.exchangeRates.find(
      (rate: any) => String(rate?._id) === String(rateId)
    );

    if (!existingRate) {
      res.status(404).json({ success: false, message: 'Exchange rate not found' });
      return;
    }

    await Currency.updateOne(
      { _id: id, organization: req.user.organizationId },
      { $pull: { exchangeRates: { _id: rateId } } }
    );

    const updatedCurrency = await Currency.findOne({
      _id: id,
      organization: req.user.organizationId,
    });

    res.json({
      success: true,
      message: 'Exchange rate deleted successfully',
      data: updatedCurrency,
    });
  } catch (error: any) {
    console.error('Error deleting exchange rate:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete exchange rate',
    });
  }
};

/**
 * Toggle exchange rate feeds
 * PUT /api/settings/currencies/exchange-rate-feeds
 */
export const toggleExchangeRateFeeds = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { enabled } = req.body;
    console.log(`[ToggleFeeds] CALLED. Org ID: ${req.user.organizationId}, Enabled: ${enabled}`);

    const organization = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      {
        $set: {
          'settings.enableExchangeRateFeeds': enabled !== undefined ? enabled : true,
        },
      },
      { new: true, runValidators: true }
    );

    console.log(`[ToggleFeeds] Resulting Org: ${organization ? 'Found' : 'Not Found'}`);

    if (!organization) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    const enableExchangeRateFeeds = organization.settings?.enableExchangeRateFeeds !== undefined
      ? organization.settings.enableExchangeRateFeeds
      : true;

    res.json({
      success: true,
      message: `Exchange rate feeds ${enableExchangeRateFeeds ? 'enabled' : 'disabled'} successfully`,
      data: {
        enableExchangeRateFeeds,
      },
    });
  } catch (error: any) {
    console.error('Error toggling exchange rate feeds:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to toggle exchange rate feeds',
    });
  }
};

/**
 * Get exchange rate feeds status
 * GET /api/settings/currencies/exchange-rate-feeds
 */
export const getExchangeRateFeedsStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const organization = await Organization.findById(req.user.organizationId);

    if (!organization) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    // Handle case where settings might not exist or enableExchangeRateFeeds might not be set
    const enableExchangeRateFeeds = organization.settings?.enableExchangeRateFeeds !== undefined
      ? organization.settings.enableExchangeRateFeeds
      : true; // Default to true if not set

    res.json({
      success: true,
      data: {
        enableExchangeRateFeeds,
      },
    });
  } catch (error: any) {
    console.error('Error fetching exchange rate feeds status:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch exchange rate feeds status',
    });
  }
};
