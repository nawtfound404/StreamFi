import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { yellowService } from '../../services/yellow.service';

const router = Router();

// Rate limiter: 60 requests per minute per IP
const limiter = rateLimit({ windowMs: 60_000, max: 60 });

router.use(authMiddleware);
router.use(limiter);

// GET /api/yellow/markets/:symbol
router.get('/markets/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await yellowService.getMarketData(symbol);
    return res.status(200).json(data);
  } catch (e: any) {
    return res.status(502).json({ message: e?.message || 'yellow market error' });
  }
});

// POST /api/yellow/orders
router.post('/orders', async (req, res) => {
  try {
    const order = await yellowService.placeOrder(req.body);
    return res.status(200).json(order);
  } catch (e: any) {
    return res.status(502).json({ message: e?.message || 'yellow order error' });
  }
});

export default router;
