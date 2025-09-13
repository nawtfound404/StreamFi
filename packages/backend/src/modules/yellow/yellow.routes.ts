import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';

// Yellow REST routes removed (no Yellow API usage). Keep an empty, protected router for compatibility.
const router = Router();
router.use(authMiddleware);

router.get('/health', (_req, res) => {
  return res.json({ ok: true, message: 'Yellow API disabled; using on-chain channel manager.' });
});

export default router;
