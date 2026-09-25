import { OrderStatus } from "@/types/database";

/**
 * Valid transitions allowed for each OrderStatus.
 * Terminal states (COMPLETED, CANCELLED) cannot transition further.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  CREATED: ["PAYMENT_PENDING", "CANCELLED"],
  PAYMENT_PENDING: ["PAID", "CANCELLED"],
  PAID: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED"],
  COMPLETED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

/**
 * Checks whether a proposed order status transition is valid.
 */
export function isValidOrderTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): boolean {
  if (currentStatus === targetStatus) return true; // No-op transition is harmless
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(targetStatus) : false;
}

/**
 * Returns the list of valid next statuses from a given status.
 */
export function getNextAllowedStatuses(currentStatus: OrderStatus): readonly OrderStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] || [];
}

/**
 * Throws an error if the transition is illegal.
 */
export function assertValidOrderTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
  orderId?: string
): void {
  if (!isValidOrderTransition(currentStatus, targetStatus)) {
    const idMsg = orderId ? ` for order ${orderId}` : "";
    throw new Error(
      `Illegal order status transition${idMsg}: Cannot transition from "${currentStatus}" to "${targetStatus}". Allowed next states: [${(
        ALLOWED_TRANSITIONS[currentStatus] || []
      ).join(", ")}]`
    );
  }
}

/**
 * Ordered sequence for customer-facing order progress tracking.
 */
export const ORDER_TRACKING_STEPS: {
  status: OrderStatus;
  label: string;
  description: string;
}[] = [
  { status: "PAID", label: "Payment Confirmed", description: "Order sent to kitchen" },
  { status: "ACCEPTED", label: "Accepted by Chef", description: "Kitchen acknowledged ticket" },
  { status: "PREPARING", label: "Preparing Food", description: "Currently cooking in kitchen" },
  { status: "READY", label: "Ready to Serve", description: "Plated and headed to your table" },
  { status: "COMPLETED", label: "Order Completed", description: "Enjoy your dining experience" },
];
