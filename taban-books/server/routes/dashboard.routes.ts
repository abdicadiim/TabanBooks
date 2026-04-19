import { Router } from 'express';
import {
  getKpiData,
  getHomeDashboardBootstrap,
  getHomeDashboardBootstrapMeta,
  getCashFlow,
  getProfitLoss,
  getTopExpenses,
  getBankAccountsSummary
} from '../controllers/dashboard.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(protect);

// Get comprehensive KPI data for dashboard
router.get('/kpi', getKpiData);

// Get lightweight freshness metadata for the home dashboard bootstrap
router.get('/home-bootstrap/meta', getHomeDashboardBootstrapMeta);

// Get consolidated dashboard bootstrap data for the home page
router.get('/home-bootstrap', getHomeDashboardBootstrap);

// Get cash flow data with period filtering
router.get('/cashflow', getCashFlow);

// Get profit and loss data
router.get('/profit-loss', getProfitLoss);

// Get top expenses
router.get('/top-expenses', getTopExpenses);

// Get bank accounts summary
router.get('/bank-accounts-summary', getBankAccountsSummary);

export default router;
