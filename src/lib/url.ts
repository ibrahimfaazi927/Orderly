/**
 * Canonical public base URL for Orderly.
 *
 * In production (Vercel) this MUST always be the single canonical domain
 * so that QR codes, copied links, and printed tent-cards all point to the
 * same stable URL — never a deployment-specific *.vercel.app preview URL.
 *
 * In local development it falls back to http://localhost:3000.
 */

const PRODUCTION_URL = "https://orderly.vercel.app";

export function getCanonicalOrigin(): string {
  if (typeof window === "undefined") {
    // Server-side: use env or fallback
    return process.env.NODE_PUBLIC_SITE_URL || PRODUCTION_URL;
  }

  // Client-side: localhost → dev, everything else → canonical production URL
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return window.location.origin; // e.g. http://localhost:3000
  }

  return PRODUCTION_URL;
}
