import crypto from "crypto";
import {
  IPaymentProvider,
  PaymentOrderRequest,
  PaymentOrderResult,
  PaymentVerificationRequest,
  PaymentVerificationResult,
} from "./types";

export class RazorpayProvider implements IPaymentProvider {
  name = "razorpay" as const;
  private keyId: string;
  private keySecret: string;
  private webhookSecret?: string;

  constructor(keyId: string, keySecret: string, webhookSecret?: string) {
    this.keyId = keyId;
    this.keySecret = keySecret;
    this.webhookSecret = webhookSecret;
  }

  async createOrder(req: PaymentOrderRequest): Promise<PaymentOrderResult> {
    const authHeader = `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64")}`;

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: Math.round(req.amount * 100), // convert to minor unit (paise)
        currency: req.currency || "INR",
        receipt: req.receipt || req.orderNumber,
        notes: req.notes || {},
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Razorpay Order Creation Failed (${res.status}): ${errorText}`);
    }

    const data = await res.json();

    return {
      gatewayOrderId: data.id,
      amount: req.amount,
      currency: req.currency,
      provider: "razorpay",
      keyId: this.keyId,
      metadata: {
        razorpay_order_id: data.id,
      },
    };
  }

  async verifyPayment(req: PaymentVerificationRequest): Promise<PaymentVerificationResult> {
    try {
      const generatedSignature = crypto
        .createHmac("sha256", this.keySecret)
        .update(`${req.gatewayOrderId}|${req.gatewayPaymentId}`)
        .digest("hex");

      const isValid = generatedSignature === req.gatewaySignature;

      return {
        isValid,
        transactionId: req.gatewayPaymentId,
        error: isValid ? undefined : "Razorpay payment signature mismatch",
      };
    } catch (e: any) {
      return {
        isValid: false,
        transactionId: req.gatewayPaymentId,
        error: e.message || "Signature verification exception",
      };
    }
  }

  async verifyWebhook(
    payload: string,
    signature: string,
    webhookSecret?: string
  ): Promise<{ isValid: boolean; event?: any }> {
    const secret = webhookSecret || this.webhookSecret;
    if (!secret) return { isValid: false };

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const isValid = expectedSignature === signature;
    const event = isValid ? JSON.parse(payload) : undefined;
    return { isValid, event };
  }
}
