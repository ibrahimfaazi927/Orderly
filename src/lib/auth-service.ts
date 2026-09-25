"use client";

import { createClient } from "@/lib/supabase/client";
import { saveLocalState, getLocalState } from "@/lib/store";
import { BusinessType } from "@/types/database";

export interface BusinessAccount {
  id: string;
  email: string;
  fullName: string;
  businessName: string;
  businessType: BusinessType | string;
  restaurantId: string;
  createdAt: string;
  password?: string;
}

const ACCOUNTS_STORAGE_KEY = "orderly_business_accounts";
const CURRENT_USER_KEY = "orderly_current_user";
const EMAIL_CHANGE_OTP_KEY = "orderly_email_change_otp";
const PASSWORD_RESET_OTP_KEY = "orderly_password_reset_otp";

export const DEFAULT_DEMO_ACCOUNT: BusinessAccount = {
  id: "acc-sunrise-001",
  email: "owner@sunrisebistro.in",
  fullName: "Ibrahim Faazi",
  businessName: "Sunrise Bistro",
  businessType: "RESTAURANT",
  restaurantId: "rest-sunrise-bistro-001",
  createdAt: "2025-01-01T00:00:00.000Z",
  password: "demo123",
};

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;
  if (url.includes("placeholder") || anonKey.includes("placeholder")) return false;
  return true;
}

export function getStoredAccounts(): BusinessAccount[] {
  if (typeof window === "undefined") return [DEFAULT_DEMO_ACCOUNT];
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify([DEFAULT_DEMO_ACCOUNT]));
      return [DEFAULT_DEMO_ACCOUNT];
    }
    const accounts: BusinessAccount[] = JSON.parse(raw);
    // Ensure default demo account exists and has its demo password
    const demoIndex = accounts.findIndex(
      (a) => a.email.toLowerCase() === "owner@sunrisebistro.in" || a.id === "acc-sunrise-001"
    );
    if (demoIndex === -1) {
      accounts.unshift(DEFAULT_DEMO_ACCOUNT);
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    } else if (!accounts[demoIndex].password) {
      accounts[demoIndex].password = "demo123";
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    }
    return accounts;
  } catch {
    return [DEFAULT_DEMO_ACCOUNT];
  }
}

export function getCurrentLocalUser(): BusinessAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSessionCookie() {
  if (typeof document === "undefined") return;
  document.cookie = "orderly_demo_session=active; path=/; max-age=86400; SameSite=Lax";
}

export function clearSessionCookie() {
  if (typeof document === "undefined") return;
  document.cookie = "orderly_demo_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
}

/**
 * Register a new business with local fallback when Supabase is unconfigured
 */
export async function registerBusiness(data: {
  businessName: string;
  businessType: BusinessType | string;
  fullName: string;
  email: string;
  password?: string;
}): Promise<{ success: boolean; error?: string; restaurantSlug?: string }> {
  const { businessName, businessType, fullName, email, password } = data;

  const slug =
    businessName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `biz-${Date.now()}`;

  const restaurantId = `rest-${Date.now()}`;

  // 1. Try Supabase registration if configured
  if (isSupabaseConfigured() && password) {
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            restaurant_name: businessName,
            business_type: businessType,
          },
        },
      });

      if (!authError) {
        setSessionCookie();
      }
    } catch {
      // Fallback seamlessly to local registration
    }
  }

  // 2. Local business registration (guarantees zero-block onboarding)
  try {
    const account: BusinessAccount = {
      id: `acc-${Date.now()}`,
      email,
      fullName,
      businessName,
      businessType,
      restaurantId,
      createdAt: new Date().toISOString(),
      password: password || undefined,
    };

    if (typeof window !== "undefined") {
      const accounts = getStoredAccounts();
      const filtered = accounts.filter((a) => a.email.toLowerCase() !== email.toLowerCase());
      filtered.push(account);
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(filtered));
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(account));
    }

    setSessionCookie();

    // Initialize fresh restaurant state
    const freshState = {
      restaurant: {
        id: restaurantId,
        name: businessName,
        slug,
        business_type: businessType,
        currency: "INR",
        tax_rate: 5.0,
        phone: "",
        address: "",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      categories: [],
      menuItems: [],
      tables: [
        {
          id: `tbl-${Date.now()}`,
          restaurant_id: restaurantId,
          table_number: "01",
          token: `tbl_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
          capacity: 4,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ],
      orders: [],
      payments: [],
    };

    saveLocalState(freshState as any);

    return { success: true, restaurantSlug: slug };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to register business" };
  }
}

/**
 * Sign in to an existing business
 * Enforces strict credentials check:
 * - Email or Business ID is required and validated against existing accounts
 * - Password is required and verified
 * - Access is only granted upon successful verification
 */
export async function loginBusiness(
  identifier: string,
  password?: string
): Promise<{ success: boolean; error?: string; account?: BusinessAccount }> {
  const cleanId = (identifier || "").trim();
  const cleanPass = (password || "").trim();

  // 1. Mandatory input validations
  if (!cleanId) {
    return {
      success: false,
      error: "Please enter your Business Email or Account ID.",
    };
  }

  if (!cleanPass) {
    return {
      success: false,
      error: "Password is required to sign in. Please enter your password.",
    };
  }

  // 2. If Supabase configured, attempt real authentication
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanId,
        password: cleanPass,
      });

      if (authError) {
        console.warn(
          "[Orderly Auth] Supabase signInWithPassword failed:",
          authError.message,
          "| status:", authError.status
        );
        return {
          success: false,
          error: authError.message || "Authentication failed. Please check your credentials.",
        };
      }

      if (authData?.user) {
        setSessionCookie();
        const accounts = getStoredAccounts();
        let existing = accounts.find(
          (a) =>
            a.email.toLowerCase() === cleanId.toLowerCase() ||
            a.id.toLowerCase() === cleanId.toLowerCase()
        );
        if (!existing) {
          existing = {
            id: authData.user.id,
            email: authData.user.email || cleanId,
            fullName: authData.user.user_metadata?.full_name || "Business Owner",
            businessName: authData.user.user_metadata?.restaurant_name || "Orderly Restaurant",
            businessType: authData.user.user_metadata?.business_type || "RESTAURANT",
            restaurantId: `rest-${authData.user.id}`,
            createdAt: authData.user.created_at || new Date().toISOString(),
          };
        }
        if (typeof window !== "undefined") {
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(existing));
        }
        return { success: true, account: existing };
      }

      return {
        success: false,
        error: "Unable to retrieve authenticated session. Please try again.",
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Orderly Auth] Unexpected error during Supabase login:", message);
      return {
        success: false,
        error: message || "An unexpected error occurred during authentication.",
      };
    }
  }

  // 3. Local account validation against registered/seeded business accounts
  const accounts = getStoredAccounts();
  const cleanLower = cleanId.toLowerCase();
  const existing = accounts.find(
    (a) => a.email.toLowerCase() === cleanLower || a.id.toLowerCase() === cleanLower
  );

  // Validate ID/Email presence in system
  if (!existing) {
    return {
      success: false,
      error: "Account not found. No registered business matches this Email or Account ID.",
    };
  }

  // Validate Password
  if (!existing.password || existing.password !== cleanPass) {
    return {
      success: false,
      error: "Incorrect password. Please verify and try again or use 'Forgot Password'.",
    };
  }

  // Permission granted
  if (typeof window !== "undefined") {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(existing));
  }
  setSessionCookie();

  return { success: true, account: existing };
}

/**
 * Request OTP for Forgot Password
 * Validates that the account exists by Email or Account ID, then dispatches OTP
 */
export async function requestPasswordResetOtp(
  identifier: string
): Promise<{
  success: boolean;
  email?: string;
  otp?: string;
  expiresAt?: number;
  error?: string;
  isDemoMode?: boolean;
}> {
  const cleanId = (identifier || "").trim().toLowerCase();
  if (!cleanId) {
    return {
      success: false,
      error: "Please enter your registered Business Email or Account ID.",
    };
  }

  const accounts = getStoredAccounts();
  const account = accounts.find(
    (a) => a.email.toLowerCase() === cleanId || a.id.toLowerCase() === cleanId
  );

  if (!account) {
    return {
      success: false,
      error: "No account found matching this Business Email or ID. Please check and try again.",
    };
  }

  // Generate 6-digit OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  if (typeof window !== "undefined") {
    localStorage.setItem(
      PASSWORD_RESET_OTP_KEY,
      JSON.stringify({
        email: account.email,
        accountId: account.id,
        otp,
        expiresAt,
        createdAt: Date.now(),
      })
    );
  }

  // Attempt to dispatch via real email SMTP
  let isDemoMode = false;
  try {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentEmail: account.email,
        otp,
        restaurantName: account.businessName || "Orderly Restaurant OS",
        purpose: "PASSWORD_RESET",
      }),
    });
    const data = await res.json();
    if (!data.configured) {
      isDemoMode = true;
    }
  } catch {
    isDemoMode = true;
  }

  return {
    success: true,
    email: account.email,
    otp, // provided so client can display demo badge if SMTP is unconfigured
    expiresAt,
    isDemoMode,
  };
}

/**
 * Verify Forgot Password OTP
 */
export function verifyPasswordResetOtp(
  email: string,
  inputOtp: string
): { valid: boolean; error?: string } {
  if (typeof window === "undefined") {
    return { valid: false, error: "Window is unavailable" };
  }

  try {
    const raw = localStorage.getItem(PASSWORD_RESET_OTP_KEY);
    if (!raw) {
      return { valid: false, error: "No OTP was requested. Please request a new verification code." };
    }

    const data = JSON.parse(raw);
    if (data.email.toLowerCase() !== email.trim().toLowerCase()) {
      return { valid: false, error: "OTP was generated for a different email address." };
    }

    if (Date.now() > data.expiresAt) {
      localStorage.removeItem(PASSWORD_RESET_OTP_KEY);
      return { valid: false, error: "Verification code has expired. Please request a new code." };
    }

    if (data.otp !== inputOtp.trim()) {
      return { valid: false, error: "Invalid 6-digit verification code. Please check and try again." };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Failed to verify OTP code." };
  }
}

/**
 * Reset Account Password with verified OTP
 */
export async function resetPasswordWithOtp(
  email: string,
  inputOtp: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  // Validate OTP first
  const verification = verifyPasswordResetOtp(email, inputOtp);
  if (!verification.valid) {
    return { success: false, error: verification.error || "Invalid verification code." };
  }

  const cleanPass = (newPassword || "").trim();
  if (cleanPass.length < 6) {
    return { success: false, error: "Password must be at least 6 characters long." };
  }

  const accounts = getStoredAccounts();
  const targetIndex = accounts.findIndex(
    (a) => a.email.toLowerCase() === email.trim().toLowerCase()
  );

  if (targetIndex === -1) {
    return { success: false, error: "Account could not be found to update password." };
  }

  accounts[targetIndex].password = cleanPass;

  if (typeof window !== "undefined") {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));

    const currentUser = getCurrentLocalUser();
    if (currentUser && currentUser.email.toLowerCase() === email.trim().toLowerCase()) {
      currentUser.password = cleanPass;
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    }

    // Invalidate the OTP now that it has been used
    localStorage.removeItem(PASSWORD_RESET_OTP_KEY);
  }

  // Update in Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({ password: cleanPass });
    } catch {}
  }

  return { success: true };
}

/**
 * Generate a 6-digit OTP for email change verification.
 * In demo mode, the OTP is returned so it can be displayed on-screen.
 * In production with Supabase, this would trigger an actual email send.
 */
export function generateEmailChangeOtp(
  currentEmail: string,
  newEmail: string
): { otp: string; expiresAt: number } {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  if (typeof window !== "undefined") {
    localStorage.setItem(
      EMAIL_CHANGE_OTP_KEY,
      JSON.stringify({ otp, currentEmail, newEmail, expiresAt })
    );
  }

  return { otp, expiresAt };
}

/**
 * Dispatch real verification email to the user's Gmail/SMTP address
 */
export async function sendRealOtpEmail(
  currentEmail: string,
  newEmail: string,
  otp: string,
  restaurantName?: string
): Promise<{ success: boolean; configured?: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentEmail, newEmail, otp, restaurantName }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      configured: false,
      error: err.message || "Failed to connect to email dispatch service",
    };
  }
}

/**
 * Verify the OTP for email change.
 */
export function verifyEmailChangeOtp(
  currentEmail: string,
  inputOtp: string
): { valid: boolean; error?: string } {
  if (typeof window === "undefined") {
    return { valid: false, error: "Window is unavailable" };
  }

  try {
    const raw = localStorage.getItem(EMAIL_CHANGE_OTP_KEY);
    if (!raw) return { valid: false, error: "No OTP was requested. Please request a new code." };

    const data = JSON.parse(raw);

    if (data.currentEmail.toLowerCase() !== currentEmail.toLowerCase()) {
      return { valid: false, error: "OTP was generated for a different account." };
    }

    if (Date.now() > data.expiresAt) {
      localStorage.removeItem(EMAIL_CHANGE_OTP_KEY);
      return { valid: false, error: "OTP has expired. Please request a new code." };
    }

    if (data.otp !== inputOtp.trim()) {
      return { valid: false, error: "Invalid verification code. Please try again." };
    }

    // OTP is valid — clear it so it can't be reused
    localStorage.removeItem(EMAIL_CHANGE_OTP_KEY);
    return { valid: true };
  } catch {
    return { valid: false, error: "Failed to verify OTP." };
  }
}

/**
 * Update business owner account credentials (email and/or password)
 */
export async function updateAccountCredentials(data: {
  currentEmail: string;
  newEmail?: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { currentEmail, newEmail, currentPassword, newPassword } = data;

  if (typeof window === "undefined") {
    return { success: false, error: "Window is unavailable" };
  }

  const accounts = getStoredAccounts();
  const existingIndex = accounts.findIndex(
    (a) => a.email.toLowerCase() === currentEmail.toLowerCase()
  );

  let account: BusinessAccount;

  if (existingIndex !== -1) {
    account = { ...accounts[existingIndex] };
  } else {
    const currentUser = getCurrentLocalUser();
    if (currentUser && currentUser.email.toLowerCase() === currentEmail.toLowerCase()) {
      account = { ...currentUser };
    } else {
      account = {
        id: `acc-${Date.now()}`,
        email: currentEmail,
        fullName: currentEmail.split("@")[0] || "Business Owner",
        businessName: getLocalState().restaurant?.name || "Orderly Business",
        businessType: getLocalState().restaurant?.business_type || "RESTAURANT",
        restaurantId: getLocalState().restaurant?.id || "rest-1",
        createdAt: new Date().toISOString(),
      };
    }
  }

  // Validate current password if account had one set and currentPassword provided
  if (account.password && currentPassword && account.password !== currentPassword) {
    return { success: false, error: "Current password does not match" };
  }

  // Handle email update
  if (newEmail && newEmail.trim() && newEmail.toLowerCase() !== currentEmail.toLowerCase()) {
    const normalizedNewEmail = newEmail.trim().toLowerCase();
    const isConflict = accounts.some(
      (a) => a.email.toLowerCase() === normalizedNewEmail && a.id !== account.id
    );
    if (isConflict) {
      return { success: false, error: "This email address is already associated with another account" };
    }
    account.email = newEmail.trim();
  }

  // Handle password update
  if (newPassword && newPassword.trim()) {
    if (newPassword.length < 6) {
      return { success: false, error: "New password must be at least 6 characters" };
    }
    account.password = newPassword.trim();
  }

  // Save back to storage
  const remainingAccounts = accounts.filter(
    (a) => a.id !== account.id && a.email.toLowerCase() !== account.email.toLowerCase()
  );
  remainingAccounts.push(account);
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(remainingAccounts));
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(account));

  // Sync to Supabase if available
  if (isSupabaseConfigured() && (newEmail || newPassword)) {
    try {
      const supabase = createClient();
      const updates: { email?: string; password?: string } = {};
      if (newEmail) updates.email = newEmail.trim();
      if (newPassword) updates.password = newPassword.trim();
      await supabase.auth.updateUser(updates);
    } catch {
      // Non-blocking for local resilience
    }
  }

  return { success: true };
}

/**
 * Log out
 */
export async function logoutBusiness() {
  clearSessionCookie();
  if (typeof window !== "undefined") {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch {}
}
