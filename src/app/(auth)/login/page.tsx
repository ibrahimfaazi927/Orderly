"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginBusiness } from "@/lib/auth-service";
import { ArrowRight, AlertCircle, Sparkles, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import OrderlyLogo from "@/components/OrderlyLogo";
import ForgotPasswordModal from "@/components/auth/ForgotPasswordModal";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const cleanId = identifier.trim();
    const cleanPass = password.trim();

    if (!cleanId) {
      setError("Please enter your Business Work Email or Account ID.");
      return;
    }

    if (!cleanPass) {
      setError("Password is strictly required. Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const res = await loginBusiness(cleanId, cleanPass);

      if (!res.success) {
        setError(res.error || "Unable to sign in. Please verify your credentials.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Unable to authenticate. Please try again.");
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    setIdentifier("owner@sunrisebistro.in");
    setPassword("demo123");
    const res = await loginBusiness("owner@sunrisebistro.in", "demo123");
    if (res.success) {
      router.push("/dashboard");
    } else {
      setError(res.error || "Failed demo authentication.");
      setLoading(false);
    }
  };

  const handleSuccessReset = (email: string) => {
    setIdentifier(email);
    setPassword("");
    setInfoMessage("Password successfully reset! Please sign in with your new password.");
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
          Log In to Your Business
        </h2>
        <p className="mt-2 text-sm" style={{ color: "#6c7d73" }}>
          Access your restaurant live orders, table QR codes, and kitchen display.
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
            <div
              className="mb-6 text-sm rounded-xl p-3.5 flex items-start gap-2.5"
              style={{
                backgroundColor: "#fdf2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
              }}
            >
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {infoMessage && (
            <div
              className="mb-6 text-sm rounded-xl p-3.5 flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>{infoMessage}</div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label
                htmlFor="identifier"
                className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                style={{ color: "#2d6a4f" }}
              >
                Business Email or Account ID
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
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
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider"
                  style={{ color: "#2d6a4f" }}
                >
                  Password
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-[#6c7d73] hover:text-[#0f2419] flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showPassword ? "Hide" : "Show"}
                  </button>
                  <span className="text-[#d8d1c5]">•</span>
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-xs font-semibold text-[#2d6a4f] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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
              className="w-full mt-2 flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60 cursor-pointer"
              style={{ backgroundColor: "#0f2419" }}
            >
              {loading ? "Authenticating Credentials..." : "Sign In to Business"}
              <ArrowRight className="ml-2 h-4 w-4 text-[#52b788]" />
            </button>
          </form>

          {/* Quick Demo Option */}
          <div className="mt-6 pt-5" style={{ borderTop: "1px solid #eae4d8" }}>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer hover:bg-[#f0ebe0]"
              style={{
                backgroundColor: "#f7f4ec",
                border: "1px solid #d8d1c5",
                color: "#1a2e1f",
              }}
            >
              <Sparkles className="h-4 w-4 text-[#2d6a4f]" />
              Explore Demo Business (Sunrise Bistro)
            </button>
          </div>

          <div className="mt-6 text-center text-sm" style={{ color: "#6c7d73" }}>
            Don't have a business account?{" "}
            <Link
              href="/signup"
              className="font-bold hover:underline transition underline-offset-4"
              style={{ color: "#0f2419" }}
            >
              Register your business &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialIdentifier={identifier}
        onSuccessReset={handleSuccessReset}
      />
    </div>
  );
}
