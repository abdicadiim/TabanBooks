import { Router } from 'express';
import { getAccountsReceivableBalance, getAccountsReceivableLedger } from '../controllers/accountsReceivable.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// Apply protection to all routes
router.use(protect);

// Get Accounts Receivable balance and summary
router.get('/balance', getAccountsReceivableBalance);

// Get full Accounts Receivable ledger
router.get('/ledger', getAccountsReceivableLedger);

export default router;
