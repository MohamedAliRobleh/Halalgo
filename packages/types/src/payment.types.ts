export type TransactionStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type PromotionType = 'percentage' | 'fixed' | 'free_delivery';
export type RefundInitiatedBy = 'customer' | 'admin' | 'system';

export interface Transaction {
  id: string;
  orderId: string;
  stripePaymentIntentId: string;
  amount: number;
  status: TransactionStatus;
  platformFee: number;
  storePayout: number;
  driverPayout: number;
  createdAt: Date;
}

export interface Refund {
  id: string;
  orderId: string;
  transactionId: string;
  amount: number;
  reason: string;
  stripeRefundId: string;
  initiatedByRole: RefundInitiatedBy;
  createdAt: Date;
}

export interface Promotion {
  id: string;
  storeId: string | null;
  code: string;
  type: PromotionType;
  value: number;
  minOrder: number;
  maxUses: number | null;
  usesCount: number;
  expiresAt: Date | null;
  isActive: boolean;
}
