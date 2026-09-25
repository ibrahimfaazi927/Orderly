"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  requestPasswordResetOtp,
  resetPasswordWithOtp,
} from "@/lib/auth-service";
import {
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
import OrderlyLogo from "@/components/OrderlyLogo";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"IDENTIFIER" | "VERIFY_RESET" | "SUCCESS">("IDENTIFIER");
  const [identifier, setIdentifier] = useState("");
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
      if (res.otp) setDemoOtp(res.otp);
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
    } catch {
      setError("An unexpected error occurred while resetting your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans"
      style={{ backgroundColor: "#f5f0e8", color: "#1a2e1f" }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <Link href="/" className="inline-flex items-center justify-center group mb-2">
          <OrderlyLogo size="lg" theme="light" showTagline={true} taglineText="Restaurant OS" />
        </Link>
        <h2 className="mt-5 text-2xl sm:text-3xl font-black tracking-tight" style={{ color: "#0f2419" }}>
          Reset Password
        </h2>
        <p className="mt-2 text-sm" style={{ color: "#6c7d73" }}>
          Revalidate your business credentials securely using a one-time OTP.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div
          className="rounded-3xl p-7 sm:p-9 shadow-xl"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #dfd7cb",
          }}
        >
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
                  Enter your registered email address or business identifier.
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

              <div className="text-center pt-3 border-t border-gray-100">
                <Link
                  href="/login"
                  className="text-xs font-bold text-[#2d6a4f] hover:underline"
                >
                  &larr; Remember your password? Sign in
                </Link>
              </div>
            </form>
          )}

          {step === "VERIFY_RESET" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
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
                      10 min expiry
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="font-mono text-2xl font-black tracking-widest text-emerald-900 bg-white px-3 py-1 rounded-xl border border-emerald-200">
                      {demoOtp}
                    </div>
                    <button
                      type="button"
                      onClick={() => setOtpCode(demoOtp)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
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
                {loading ? "Verifying & Updating..." : "Reset Password & Save"}
                <ShieldCheck className="ml-2 h-4 w-4 text-[#52b788]" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep("IDENTIFIER")}
                  className="text-xs text-[#6c7d73] hover:text-[#0f2419] underline cursor-pointer"
                >
                  &larr; Re-enter account identifier
                </button>
              </div>
            </form>
          )}

          {step === "SUCCESS" && (
            <div className="text-center py-4 space-y-4">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-[#0f2419]">Password Reset Successfully!</h4>
                <p className="text-xs text-[#6c7d73] mt-1">
                  Your credentials have been revalidated and updated. You can now log into your business dashboard.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push("/login")}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white shadow-sm transition hover:opacity-95 cursor-pointer"
                style={{ backgroundColor: "#0f2419" }}
              >
                Go to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
