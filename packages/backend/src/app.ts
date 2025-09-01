// 📄 src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middlewares/errorHandler';
import { rateLimiter } from './middlewares/rateLimiter';
import apiRoutes from './routes';

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);
app.use('/api', apiRoutes);
app.get('/health', (_req, res) => res.status(200).json({ status: 'UP' }));
app.use(errorHandler);
export default app;
