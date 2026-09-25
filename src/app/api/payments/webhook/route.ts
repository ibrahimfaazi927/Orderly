import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";

    const provider = getPaymentProvider();

    if (provider.verifyWebhook) {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
      const verification = await provider.verifyWebhook(rawBody, signature, webhookSecret);
      if (!verification.isValid) {
        logger.warn("webhook_signature_rejected", { gateway: provider.name });
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody || "{}");
    const supabaseAdmin = createAdminClient();

    // Idempotency check: check if event has already been recorded
    const eventId = event.id || `evt_${Date.now()}`;
    const { data: existingWebhook } = await supabaseAdmin
      .from("payment_webhooks")
      .select("id")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existingWebhook) {
      // Already processed, return 200 immediately
      logger.info("webhook_already_processed", { eventId, gateway: provider.name });
      return NextResponse.json({ status: "already_processed", received: true });
    }

    // Insert into payment_webhooks conforming to database schema
    try {
      await supabaseAdmin.from("payment_webhooks").insert({
        event_id: eventId,
        gateway: provider.name,
        payload: event,
        processed_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      logger.warn("webhook_db_insert_failed", { eventId, error: dbErr });
    }

    // Process payment captured event to update order status
    const eventType = event.event || "";
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.notes?.orderId || paymentEntity?.order_id;

      if (orderId) {
        try {
          await supabaseAdmin
            .from("orders")
            .update({
              status: "PAID",
              payment_status: "SUCCESS",
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId);
          logger.info("order_status_updated_by_webhook", { orderId, status: "PAID" });
        } catch (dbErr) {
          logger.error("order_status_update_failed", dbErr, { orderId });
        }
      }
    }

    logger.info("webhook_processed_successfully", { eventId, eventType });
    return NextResponse.json({ status: "ok", received: true });
  } catch (err: any) {
    logger.error("webhook_processing_error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
