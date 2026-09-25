import { IPaymentProvider } from "./types";
import { RazorpayProvider } from "./razorpay";
import { MockPaymentProvider } from "./mock";

export * from "./types";
export { RazorpayProvider } from "./razorpay";
export { MockPaymentProvider } from "./mock";

export function getPaymentProvider(customConfig?: {
  keyId?: string;
  keySecret?: string;
  webhookSecret?: string;
}): IPaymentProvider {
  const providerMode = (process.env.PAYMENT_PROVIDER || "").toLowerCase();
  const keyId = customConfig?.keyId || process.env.RAZORPAY_KEY_ID;
  const keySecret = customConfig?.keySecret || process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = customConfig?.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;

  // If explicitly configured for sandbox in development, return mock provider
  if (providerMode === "sandbox" && process.env.NODE_ENV !== "production" && !customConfig) {
    return new MockPaymentProvider();
  }

  if (keyId && keySecret) {
    return new RazorpayProvider(keyId, keySecret, webhookSecret);
  }

  // Prevent mock provider in production unless explicitly configured
  if (process.env.NODE_ENV === "production" && providerMode !== "sandbox") {
    throw new Error(
      "Payment gateway configuration error: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required in production."
    );
  }

  // Fallback to robust Sandbox mock provider for local development
  return new MockPaymentProvider();
}
