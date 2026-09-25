export interface PaymentOrderRequest {
  orderId: string;
  orderNumber: string;
  amount: number; // in minor units (e.g., paise for INR, cents for USD)
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface PaymentOrderResult {
  gatewayOrderId: string;
  amount: number;
  currency: string;
  provider: "razorpay" | "mock";
  keyId?: string;
  metadata?: Record<string, any>;
}

export interface PaymentVerificationRequest {
  orderId: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature: string;
}

export interface PaymentVerificationResult {
  isValid: boolean;
  transactionId: string;
  error?: string;
}

export interface IPaymentProvider {
  name: "razorpay" | "mock";
  createOrder(req: PaymentOrderRequest): Promise<PaymentOrderResult>;
  verifyPayment(req: PaymentVerificationRequest): Promise<PaymentVerificationResult>;
  verifyWebhook?(payload: string, signature: string, webhookSecret: string): Promise<{ isValid: boolean; event?: any }>;
}
