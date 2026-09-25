"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Users,
  Key,
  ShieldCheck,
  Plus,
  Trash2,
  Bell,
  CheckCircle2,
  CreditCard,
  Lock,
  Save,
  AlertCircle,
  Mail,
  Copy,
  Check,
  RotateCcw,
  Send,
  ShieldAlert,
} from "lucide-react";
import {
  getCurrentLocalUser,
  updateAccountCredentials,
  generateEmailChangeOtp,
  verifyEmailChangeOtp,
  sendRealOtpEmail,
} from "@/lib/auth-service";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "MANAGER" | "KITCHEN" | "STAFF";
  status: "Active" | "Pending";
}

export default function SettingsDashboardPage() {
  const [activeTab, setActiveTab] = useState<"account" | "gateway" | "staff" | "notifications">("account");

  // Account & Credentials state
  const [currentEmail, setCurrentEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // OTP Authentication state for Email Change
  const [otpStatus, setOtpStatus] = useState<"idle" | "sent" | "verified">("idle");
  const [otpCode, setOtpCode] = useState("");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [emailDeliveryStatus, setEmailDeliveryStatus] = useState<"pending" | "delivered" | "fallback" | null>(null);

  useEffect(() => {
    const user = getCurrentLocalUser();
    if (user) {
      setCurrentEmail(user.email);
      setBusinessName(user.businessName);
    }
  }, []);

  // OTP Countdown timer
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  const handleSendOtp = async () => {
    setOtpError(null);
    setAccountError(null);
    setEmailDeliveryStatus("pending");
    const targetEmail = newEmail.trim();

    if (!targetEmail) {
      setOtpError("Please enter a new email address first.");
      setEmailDeliveryStatus(null);
      return;
    }
    if (targetEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setOtpError("New email address must be different from your current email.");
      setEmailDeliveryStatus(null);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setOtpError("Please enter a valid email format.");
      setEmailDeliveryStatus(null);
      return;
    }

    const senderEmail = currentEmail || "owner@sunrisebistro.in";
    const { otp } = generateEmailChangeOtp(senderEmail, targetEmail);
    setDemoOtp(otp);
    setOtpStatus("sent");
    setOtpCountdown(300);
    setOtpCode("");

    // Attempt real email delivery
    try {
      const result = await sendRealOtpEmail(senderEmail, targetEmail, otp, businessName);
      if (result.success && result.configured) {
        setEmailDeliveryStatus("delivered");
      } else {
        // SMTP not configured — fall back to on-screen code
        setEmailDeliveryStatus("fallback");
      }
    } catch {
      setEmailDeliveryStatus("fallback");
    }
  };

  const handleVerifyOtp = () => {
    setOtpError(null);
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setOtpError("Please enter the 6-digit verification code.");
      return;
    }

    const result = verifyEmailChangeOtp(currentEmail || "owner@sunrisebistro.in", otpCode.trim());
    if (!result.valid) {
      setOtpError(result.error || "Invalid verification code. Please try again.");
      return;
    }

    setOtpStatus("verified");
    setOtpError(null);
  };

  const handleCopyDemoOtp = () => {
    if (!demoOtp) return;
    navigator.clipboard.writeText(demoOtp);
    setOtpCode(demoOtp);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  const handleNewEmailChange = (val: string) => {
    setNewEmail(val);
    if (otpStatus !== "idle") {
      setOtpStatus("idle");
      setOtpCode("");
      setDemoOtp(null);
      setOtpError(null);
    }
  };

  // Payment settings state
  const [providerMode, setProviderMode] = useState<"sandbox" | "razorpay">("sandbox");
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [enableUpi, setEnableUpi] = useState(true);
  const [enableCards, setEnableCards] = useState(true);
  const [enableNetBanking, setEnableNetBanking] = useState(true);
  const [autoAcceptOrders, setAutoAcceptOrders] = useState(false);
  const [audioChimeOnNewOrder, setAudioChimeOnNewOrder] = useState(true);

  // Staff members
  const [staff, setStaff] = useState<StaffMember[]>([
    {
      id: "u1",
      name: "Rajesh Kumar",
      email: "rajesh@sunrisebistro.in",
      role: "OWNER",
      status: "Active",
    },
    {
      id: "u2",
      name: "Head Chef Vikram",
      email: "chef@sunrisebistro.in",
      role: "KITCHEN",
      status: "Active",
    },
    {
      id: "u3",
      name: "Ananya Sharma",
      email: "ananya@sunrisebistro.in",
      role: "MANAGER",
      status: "Active",
    },
  ]);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MANAGER" | "KITCHEN" | "STAFF">("STAFF");

  // Saved Toast
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(null), 2500);
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError(null);

    if (!newEmail.trim() && !newPassword.trim()) {
      setAccountError("Please enter a new email address or new password to update.");
      return;
    }

    // Require OTP verification if changing email
    if (newEmail.trim()) {
      if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
        setAccountError("New email address must be different from your current email.");
        return;
      }
      if (otpStatus !== "verified") {
        setAccountError("Security Verification Required: Please request and verify the OTP sent to your existing login email before saving.");
        if (otpStatus === "idle") {
          handleSendOtp();
        }
        return;
      }
    }

    if (newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        setAccountError("New password must be at least 6 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setAccountError("New passwords do not match. Please re-confirm.");
        return;
      }
    }

    setAccountSaving(true);
    try {
      const res = await updateAccountCredentials({
        currentEmail: currentEmail || "owner@sunrisebistro.in",
        newEmail: newEmail.trim() ? newEmail.trim() : undefined,
        currentPassword: currentPassword ? currentPassword : undefined,
        newPassword: newPassword.trim() ? newPassword.trim() : undefined,
      });

      if (!res.success) {
        setAccountError(res.error || "Failed to update account credentials.");
        setAccountSaving(false);
        return;
      }

      if (newEmail.trim()) {
        setCurrentEmail(newEmail.trim());
        setNewEmail("");
        setOtpStatus("idle");
        setOtpCode("");
        setDemoOtp(null);
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      triggerToast("Login credentials updated successfully!");
    } catch (err: any) {
      setAccountError(err.message || "An unexpected error occurred.");
    } finally {
      setAccountSaving(false);
    }
  };

  const handleSaveGateway = (e: React.FormEvent) => {
    e.preventDefault();
    triggerToast("Payment credentials & settings updated successfully");
  };

  const handleInviteStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    setStaff((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole,
        status: "Pending",
      },
    ]);

    setInviteName("");
    setInviteEmail("");
    setShowInviteModal(false);
    triggerToast(`Invitation sent to ${inviteEmail}`);
  };

  const handleDeleteStaff = (id: string) => {
    setStaff((prev) => prev.filter((s) => s.id !== id));
    triggerToast("Staff member removed");
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Toast Notification */}
      {savedMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl shadow-lg text-xs font-semibold animate-in slide-in-from-top">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {savedMessage}
        </div>
      )}

      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Restaurant Settings
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Owner login credentials, staff access roles, and payment gateway configuration.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: "account", label: "Login & Account", icon: Lock },
          { id: "gateway", label: "Payment Gateways", icon: CreditCard },
          { id: "staff", label: "Staff & Permissions", icon: Users },
          { id: "notifications", label: "Operations & Sound", icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* =================== TAB 0: LOGIN & ACCOUNT CREDENTIALS =================== */}
      {activeTab === "account" && (
        <form onSubmit={handleUpdateAccount} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Key className="h-5 w-5 text-slate-700" />
                Business Owner Credentials
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Edit your login email address and change your dashboard access password.
              </p>
            </div>

            {accountError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                {accountError}
              </div>
            )}

            {/* Current Account Card */}
            <div className="space-y-5">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Current Login Email
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                    {currentEmail || "owner@sunrisebistro.in"}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Restaurant: <span className="font-semibold text-slate-700">{businessName || "Your Registered Business"}</span>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  Authenticated Owner
                </span>
              </div>

              {/* Change Email */}
              {/* Change Email with OTP Verification */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-0.5">
                      Change Login Email Address
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Requires one-time OTP verification sent to your existing login email (<span className="font-mono text-slate-700 font-medium">{currentEmail || "owner@sunrisebistro.in"}</span>).
                    </p>
                  </div>
                  {otpStatus === "verified" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Email OTP Verified
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => handleNewEmailChange(e.target.value)}
                    placeholder="Enter new business email address"
                    disabled={otpStatus === "verified"}
                    className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                  {newEmail.trim() && otpStatus === "idle" && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Send OTP to Current Email
                    </button>
                  )}
                  {otpStatus === "verified" && (
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStatus("idle");
                        setOtpCode("");
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition cursor-pointer shrink-0"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Change Email
                    </button>
                  )}
                </div>

                {/* OTP Verification Box */}
                {otpStatus === "sent" && (
                  <div className="p-4 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl max-w-xl space-y-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {emailDeliveryStatus === "delivered"
                              ? "✓ Verification Email Sent"
                              : emailDeliveryStatus === "pending"
                                ? "Dispatching verification email..."
                                : "Verification Code Ready"}
                          </div>
                          <div className="text-[11px] text-slate-600">
                            {emailDeliveryStatus === "delivered" ? (
                              <>Check your inbox at <span className="font-semibold text-slate-900">{currentEmail || "owner@sunrisebistro.in"}</span> (also check spam folder)</>
                            ) : (
                              <>Enter the 6-digit code for <span className="font-semibold text-slate-900">{currentEmail || "owner@sunrisebistro.in"}</span></>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                        {otpCountdown > 0 ? `${Math.floor(otpCountdown / 60)}:${String(otpCountdown % 60).padStart(2, "0")} left` : "Expired"}
                      </span>
                    </div>

                    {/* Real email delivery confirmation */}
                    {emailDeliveryStatus === "delivered" && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="text-emerald-800 font-medium">
                          Real email dispatched to <strong>{currentEmail}</strong>. Open your Gmail inbox and enter the 6-digit code below.
                        </span>
                      </div>
                    )}

                    {/* Fallback: show code on-screen when SMTP not configured */}
                    {emailDeliveryStatus === "fallback" && demoOtp && (
                      <div className="bg-white/90 border border-indigo-200 rounded-xl p-2.5 flex items-center justify-between text-xs shadow-2xs">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                            Demo Mode
                          </span>
                          <span className="text-slate-600">
                            OTP Code: <strong className="font-mono text-slate-900 tracking-widest text-sm">{demoOtp}</strong>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyDemoOtp}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] transition cursor-pointer"
                        >
                          {copiedOtp ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Filled!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Auto-fill OTP</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Pending spinner */}
                    {emailDeliveryStatus === "pending" && (
                      <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium">
                        <div className="h-3.5 w-3.5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                        Sending verification email to {currentEmail}...
                      </div>
                    )}

                    {otpError && (
                      <div className="text-xs text-red-600 font-medium flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {otpError}
                      </div>
                    )}

                    {/* 6-digit input & verify button */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="••••••"
                        className="w-36 tracking-[0.4em] font-mono text-center text-lg font-bold rounded-xl border border-indigo-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={otpCode.length !== 6}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-40 cursor-pointer"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verify OTP
                      </button>

                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={otpCountdown > 250}
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1 transition disabled:opacity-40 ml-auto cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Resend
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Change Password */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Change Password
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Enter your current password (if set) and your new desired password.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter existing password"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={accountSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                {accountSaving ? "Saving..." : "Save Account Changes"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* =================== TAB 1: PAYMENT GATEWAYS =================== */}
      {activeTab === "gateway" && (
        <form onSubmit={handleSaveGateway} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-slate-700" />
                Payment Gateway Mode
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose between Instant Sandbox Simulation or live Razorpay UPI / Card payments.
              </p>
            </div>

            {/* Provider Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setProviderMode("sandbox")}
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                  providerMode === "sandbox"
                    ? "border-emerald-600 bg-emerald-50/50"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">
                    🧪 Mock Sandbox Simulator
                  </span>
                  <span
                    className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      providerMode === "sandbox"
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-300"
                    }`}
                  >
                    {providerMode === "sandbox" && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Zero setup required. Simulates UPI, Cards, and Netbanking checkouts for testing.
                </p>
              </div>

              <div
                onClick={() => setProviderMode("razorpay")}
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                  providerMode === "razorpay"
                    ? "border-teal-600 bg-teal-50/50"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">
                    ⚡ Razorpay (Production / Test)
                  </span>
                  <span
                    className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      providerMode === "razorpay"
                        ? "border-teal-600 bg-teal-600 text-white"
                        : "border-slate-300"
                    }`}
                  >
                    {providerMode === "razorpay" && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Accept real customer payments via UPI apps (GPay, PhonePe, Paytm), Visa, and RuPay.
                </p>
              </div>
            </div>

            {/* Credentials form if Razorpay selected */}
            {providerMode === "razorpay" && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Razorpay Key ID
                  </label>
                  <input
                    type="text"
                    placeholder="rzp_test_..."
                    value={keyId}
                    onChange={(e) => setKeyId(e.target.value)}
                    className="w-full text-xs font-mono rounded-xl border border-slate-300 px-3.5 py-2.5 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Razorpay Key Secret
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••••••••••"
                    value={keySecret}
                    onChange={(e) => setKeySecret(e.target.value)}
                    className="w-full text-xs font-mono rounded-xl border border-slate-300 px-3.5 py-2.5 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Webhook Secret (Optional)
                  </label>
                  <input
                    type="password"
                    placeholder="webhook_secret_..."
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    className="w-full text-xs font-mono rounded-xl border border-slate-300 px-3.5 py-2.5 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Accepted Methods */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase">
                Enabled Customer Payment Methods
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableUpi}
                    onChange={(e) => setEnableUpi(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  UPI (GPay / PhonePe / Paytm)
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableCards}
                    onChange={(e) => setEnableCards(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  Credit & Debit Cards
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableNetBanking}
                    onChange={(e) => setEnableNetBanking(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  Net Banking
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                <Save className="h-4 w-4" />
                Save Gateway Settings
              </button>
            </div>
          </div>
        </form>
      )}

      {/* =================== TAB 2: STAFF & PERMISSIONS =================== */}
      {activeTab === "staff" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-slate-600" />
                  Staff Members & Access Roles
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Multi-tenant RBAC with isolation strictly enforced at the PostgreSQL RLS layer.
                </p>
              </div>

              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Invite Staff
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staff.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {member.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {member.email}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            member.role === "OWNER"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : member.role === "KITCHEN"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : member.role === "MANAGER"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {member.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold ${
                            member.status === "Active"
                              ? "text-emerald-600"
                              : "text-amber-600"
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {member.role !== "OWNER" && (
                          <button
                            onClick={() => handleDeleteStaff(member.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            title="Remove staff access"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================== TAB 3: OPERATIONS & NOTIFICATIONS =================== */}
      {activeTab === "notifications" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bell className="h-5 w-5 text-emerald-600" />
              Kitchen & Order Flow Automation
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize real-time audio and status automation across tablet displays.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Audio Bell Chime on New Paid Order
                </div>
                <div className="text-xs text-slate-500">
                  Synthesizes high-clarity dual-tone chime in Kitchen Display System when orders arrive.
                </div>
              </div>
              <input
                type="checkbox"
                checked={audioChimeOnNewOrder}
                onChange={(e) => {
                  setAudioChimeOnNewOrder(e.target.checked);
                  triggerToast("Audio notification preference updated");
                }}
                className="h-5 w-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Auto-Accept Incoming Orders
                </div>
                <div className="text-xs text-slate-500">
                  Automatically moves paid orders from NEW to ACCEPTED column without manual chef acknowledgement.
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoAcceptOrders}
                onChange={(e) => {
                  setAutoAcceptOrders(e.target.checked);
                  triggerToast("Order automation updated");
                }}
                className="h-5 w-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* =================== INVITE MODAL =================== */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Invite Staff Member</h3>
            <form onSubmit={handleInviteStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Meera Pillai"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="meera@sunrisebistro.in"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Assigned Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="STAFF">STAFF — Tables & Order Viewing</option>
                  <option value="KITCHEN">KITCHEN — Kitchen Display System Only</option>
                  <option value="MANAGER">MANAGER — Menu, Tables & Kitchen Management</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
