import {
  IPaymentProvider,
  PaymentOrderRequest,
  PaymentOrderResult,
  PaymentVerificationRequest,
  PaymentVerificationResult,
} from "./types";

export class MockPaymentProvider implements IPaymentProvider {
  name = "mock" as const;

  async createOrder(req: PaymentOrderRequest): Promise<PaymentOrderResult> {
    const mockGatewayOrderId = `rzp_mock_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      gatewayOrderId: mockGatewayOrderId,
      amount: req.amount,
      currency: req.currency || "INR",
      provider: "mock",
      keyId: "rzp_test_mock_sandbox",
      metadata: {
        receipt: req.receipt,
        simulated: true,
      },
    };
  }

  async verifyPayment(req: PaymentVerificationRequest): Promise<PaymentVerificationResult> {
    // In mock provider, enforce valid simulated signature format and payment identifier
    const hasValidSignature =
      Boolean(req.gatewaySignature) &&
      (req.gatewaySignature.startsWith("sig_mock_") || req.gatewaySignature === "sig_verified_mock_sandbox");
    const hasValidPaymentId = Boolean(req.gatewayPaymentId && req.gatewayPaymentId.length >= 6);

    const isValid = hasValidSignature && hasValidPaymentId;

    return {
      isValid,
      transactionId: req.gatewayPaymentId || `pay_mock_${Date.now()}`,
      error: isValid ? undefined : "Mock payment signature verification failed",
    };
  }

  async verifyWebhook(payload: string, signature: string): Promise<{ isValid: boolean; event?: any }> {
    return {
      isValid: true,
      event: { event: "payment.captured", mock: true },
    };
  }
}
