"use client";

import { useState } from "react";
import {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordWithOtp,
} from "@/lib/auth-service";
import {
  X,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIdentifier?: string;
  onSuccessReset?: (email: string) => void;
}

type ResetStep = "IDENTIFIER" | "VERIFY_RESET" | "SUCCESS";

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  initialIdentifier = "",
  onSuccessReset,
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<ResetStep>("IDENTIFIER");
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [targetEmail, setTargetEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Please enter your registered Business Email or Account ID.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await requestPasswordResetOtp(identifier);
      if (!res.success) {
        setError(res.error || "Unable to find an account with this identifier.");
        setLoading(false);
        return;
      }

      setTargetEmail(res.email || identifier);
      if (res.otp) {
        setDemoOtp(res.otp);
      }
      setIsDemoMode(!!res.isDemoMode);
      setStep("VERIFY_RESET");
    } catch {
      setError("Failed to request verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await requestPasswordResetOtp(targetEmail || identifier);
      if (res.success) {
        if (res.otp) setDemoOtp(res.otp);
        setIsDemoMode(!!res.isDemoMode);
        setSuccessMsg("A new verification code has been dispatched!");
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setError(res.error || "Failed to resend code.");
      }
    } catch {
      setError("Error resending verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOtp = otpCode.trim();
    if (cleanOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);

    try {
      const res = await resetPasswordWithOtp(targetEmail, cleanOtp, newPassword);
      if (!res.success) {
        setError(res.error || "Failed to reset password. Please check your verification code.");
        setLoading(false);
        return;
      }

      setStep("SUCCESS");
      if (onSuccessReset) {
        onSuccessReset(targetEmail);
      }
    } catch {
      setError("An unexpected error occurred while resetting your password.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("IDENTIFIER");
    setError(null);
    setSuccessMsg(null);
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
    setDemoOtp(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl relative"
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #dfd7cb",
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-5 top-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "#1a3d28", color: "#52b788" }}
          >
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#0f2419]">
              {step === "SUCCESS" ? "Password Reset Complete" : "Reset Business Password"}
            </h3>
            <p className="text-xs text-[#6c7d73]">
              {step === "IDENTIFIER" && "Enter your registered Email or Account ID"}
              {step === "VERIFY_RESET" && `Verification code sent for ${targetEmail}`}
              {step === "SUCCESS" && "You can now log in with your new password"}
            </p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 text-xs rounded-xl p-3 bg-red-50 border border-red-200 text-red-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 text-xs rounded-xl p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: Enter Identifier */}
        {step === "IDENTIFIER" && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#2d6a4f]">
                Business Email or Account ID
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="owner@sunrisebistro.in or acc-sunrise-001"
                className="block w-full rounded-xl px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
                style={{
                  backgroundColor: "#faf8f4",
                  border: "1px solid #d8d1c5",
                  color: "#0f2419",
                }}
              />
              <p className="text-[11px] text-[#6c7d73] mt-1.5">
                We'll validate your account credentials and dispatch a 6-digit OTP verification code.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60 cursor-pointer"
              style={{ backgroundColor: "#0f2419" }}
            >
              {loading ? "Validating Account..." : "Send Verification Code"}
              <ArrowRight className="ml-2 h-4 w-4 text-[#52b788]" />
            </button>
          </form>
        )}

        {/* STEP 2: Verify OTP and Set Password */}
        {step === "VERIFY_RESET" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* Demo/Dev Mode Banner */}
            {demoOtp && (
              <div
                className="p-3.5 rounded-2xl border"
                style={{
                  backgroundColor: "#f0fdf4",
                  borderColor: "#bbf7d0",
                }}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    Security Verification OTP
                  </span>
                  <span className="text-[10px] bg-emerald-200/60 px-2 py-0.5 rounded-full text-emerald-900 font-mono">
                    Valid for 10 min
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="font-mono text-2xl font-black tracking-widest text-emerald-900 bg-white px-3 py-1 rounded-xl border border-emerald-200">
                    {demoOtp}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtpCode(demoOtp)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline underline-offset-2 cursor-pointer"
                  >
                    Auto-Fill Code
                  </button>
                </div>
                <p className="text-[11px] text-emerald-700 mt-2">
                  {isDemoMode
                    ? "In development/demo mode, code is displayed above. In production with SMTP configured, this is emailed."
                    : `Dispatched to ${targetEmail}. Check your inbox or use code above.`}
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2d6a4f]">
                  6-Digit OTP Code
                </label>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-xs text-[#2d6a4f] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  Resend code
                </button>
              </div>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="123456"
                className="block w-full font-mono text-center tracking-[0.5em] text-lg rounded-xl px-3.5 py-2.5 font-bold transition focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
                style={{
                  backgroundColor: "#faf8f4",
                  border: "1px solid #d8d1c5",
                  color: "#0f2419",
                }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2d6a4f]">
                  New Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-[#6c7d73] hover:text-[#0f2419] flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="block w-full rounded-xl px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
                style={{
                  backgroundColor: "#faf8f4",
                  border: "1px solid #d8d1c5",
                  color: "#0f2419",
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#2d6a4f]">
                Confirm New Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="block w-full rounded-xl px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
                style={{
                  backgroundColor: "#faf8f4",
                  border: "1px solid #d8d1c5",
                  color: "#0f2419",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60 cursor-pointer"
              style={{ backgroundColor: "#0f2419" }}
            >
              {loading ? "Verifying & Updating..." : "Reset Password & Grant Access"}
              <ShieldCheck className="ml-2 h-4 w-4 text-[#52b788]" />
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setStep("IDENTIFIER")}
                className="text-xs text-[#6c7d73] hover:text-[#0f2419] underline cursor-pointer"
              >
                &larr; Change email or account ID
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Success Confirmation */}
        {step === "SUCCESS" && (
          <div className="text-center py-4 space-y-4">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-[#0f2419]">Password Reset Successfully!</h4>
              <p className="text-xs text-[#6c7d73] mt-1">
                Your account password for <strong className="text-[#0f2419]">{targetEmail}</strong> has been updated. You can now log in securely.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white shadow-sm transition hover:opacity-95 cursor-pointer"
              style={{ backgroundColor: "#0f2419" }}
            >
              Return to Login Form
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
