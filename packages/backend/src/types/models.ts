export enum UserRole {
  STREAMER = 'STREAMER',
  AUDIENCE = 'AUDIENCE',
  ADMIN = 'ADMIN',
}

export enum StreamStatus {
  IDLE = 'IDLE',
  LIVE = 'LIVE',
  ERROR = 'ERROR',
}

export enum TransactionType {
  DONATION = 'DONATION',
  NFT_SALE = 'NFT_SALE',
  PAYOUT = 'PAYOUT',
  CREDIT_PURCHASE = 'CREDIT_PURCHASE',
  REFUND = 'REFUND',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  REJECTED = 'REJECTED',
}

export type SafeUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  displayName?: string | null;
  role: UserRole;
};
