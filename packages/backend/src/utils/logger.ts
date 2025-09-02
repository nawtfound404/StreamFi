import pino from 'pino';

const level = process.env.LOG_LEVEL || 'info';
export const logger = pino({
  level,
  base: { service: 'streamfi-backend' },
  redact: ['req.headers.authorization', 'headers.authorization'],
  transport: process.env.NODE_ENV === 'production' ? undefined : {
    target: 'pino-pretty',
    options: { colorize: true }
  },
});

export function withReqId(reqId: string) {
  return logger.child({ reqId });
}

