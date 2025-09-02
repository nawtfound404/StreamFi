import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 300, // 300 reqs per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.',
  keyGenerator: (req) => req.ip || 'unknown',
});

export const authBurstLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // login/auth-protected bursts
  standardHeaders: true,
  legacyHeaders: false,
});
