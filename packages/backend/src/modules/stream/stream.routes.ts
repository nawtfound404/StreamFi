import { Router } from 'express';
import { getIngest, getStreamStatus, getHls } from './stream.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
const router = Router();
router.post('/ingest', authMiddleware, getIngest);
router.get('/:id/status', getStreamStatus);
router.get('/:id/hls', getHls);
export default router;
