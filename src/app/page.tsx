"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  LogIn,
  UserPlus,
  UtensilsCrossed,
  ChefHat,
  Coffee,
  CheckCircle2,
  Clock,
  QrCode,
  CreditCard,
  Eye,
  EyeOff,
} from "lucide-react";
import { registerBusiness, loginBusiness } from "@/lib/auth-service";
import { getLocalState } from "@/lib/store";
import { BusinessType } from "@/types/database";
import OrderlyLogo from "@/components/OrderlyLogo";
import ForgotPasswordModal from "@/components/auth/ForgotPasswordModal";

const BUSINESS_TYPES = [
  { value: "RESTAURANT", label: "🍽️ Restaurant / Fine Dining" },
  { value: "CAFE", label: "☕ Cafe & Coffee Shop" },
  { value: "ICE_CREAM", label: "🍦 Ice Cream Parlour & Desserts" },
  { value: "BAKERY", label: "🥖 Bakery & Patisserie" },
  { value: "FOOD_TRUCK", label: "🚚 Food Truck & Pop-up" },
  { value: "BAR_PUB", label: "🍺 Bar, Pub & Brewery" },
  { value: "FAST_FOOD", label: "🍕 Fast Food & QSR" },
  { value: "OTHER", label: "🍴 Other Food Business" },
];

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeBizName, setActiveBizName] = useState<string>("");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [regName, setRegName] = useState("");
  const [regType, setRegType] = useState<BusinessType>("RESTAURANT");
  const [regOwner, setRegOwner] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const hasSession = document.cookie.includes("orderly_demo_session=active");
      if (hasSession) {
        setIsLoggedIn(true);
        const state = getLocalState();
        setActiveBizName(state.restaurant?.name || "Your Business");
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanId = loginEmail.trim();
    const cleanPass = loginPassword.trim();

    if (!cleanId) {
      setLoginError("Please enter your Business Email or Account ID.");
      return;
    }

    if (!cleanPass) {
      setLoginError("Password is strictly required. Please enter your password.");
      return;
    }

    setLoginLoading(true);

    try {
      const res = await loginBusiness(cleanId, cleanPass);
      if (!res.success) {
        setLoginError(res.error || "Invalid credentials. Please verify your credentials.");
        setLoginLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setLoginError("Failed to authenticate. Please try again.");
      setLoginLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    setLoginLoading(true);
    await loginBusiness("owner@sunrisebistro.in", "demo123");
    router.push("/dashboard");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);

    try {
      const res = await registerBusiness({
        businessName: regName,
        businessType: regType,
        fullName: regOwner,
        email: regEmail,
        password: regPassword,
      });

      if (!res.success) {
        setRegError(res.error || "Failed to register business");
        setRegLoading(false);
        return;
      }

      router.push(`/dashboard/onboarding?name=${encodeURIComponent(regName)}&type=${encodeURIComponent(regType)}`);
    } catch {
      setRegError("Error registering your business. Please try again.");
      setRegLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col font-sans relative selection:bg-[#2d6a4f] selection:text-white"
      style={{ backgroundColor: "#f5f0e8", color: "#1a2e1f" }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md transition"
        style={{
          backgroundColor: "rgba(245, 240, 232, 0.92)",
          borderBottom: "1px solid #e0d8cc",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center">
              <OrderlyLogo size="md" theme="light" showTagline={true} taglineText="Restaurant OS" />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold transition shadow-sm hover:opacity-95"
                style={{ backgroundColor: "#0f2419" }}
              >
                Go to {activeBizName || "Dashboard"}
                <ArrowRight className="h-4 w-4 text-[#52b788]" />
              </Link>
            ) : (
              <div
                className="flex items-center p-1 rounded-xl"
                style={{ backgroundColor: "#eae4d8", border: "1px solid #d8d1c5" }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab("login")}
                  className={`text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                    activeTab === "login"
                      ? "text-white shadow-xs"
                      : "text-[#5c6b62] hover:text-[#1a2e1f]"
                  }`}
                  style={{
                    backgroundColor: activeTab === "login" ? "#0f2419" : "transparent",
                  }}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("register")}
                  className={`text-xs sm:text-sm font-bold px-4 py-1.5 rounded-lg transition cursor-pointer ${
                    activeTab === "register"
                      ? "text-white shadow-xs"
                      : "text-[#5c6b62] hover:text-[#1a2e1f]"
                  }`}
                  style={{
                    backgroundColor: activeTab === "register" ? "#0f2419" : "transparent",
                  }}
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 w-full flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
        {/* Left Column: Brand & Value Prop */}
        <div className="flex-1 text-center lg:text-left space-y-6 max-w-2xl">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold"
            style={{
              backgroundColor: "#d8f3dc",
              color: "#1b4332",
              border: "1px solid #b7e4c7",
            }}
          >
            <Sparkles className="h-3.5 w-3.5 text-[#2d6a4f]" />
            Built for Modern Restaurants, Cafes & Fine Dining
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]"
            style={{ color: "#0f2419" }}
          >
            Empower Your Food Business with{" "}
            <span style={{ color: "#2d6a4f" }}>
              Modern QR Dining.
            </span>
          </h1>

          <p
            className="text-base sm:text-lg leading-relaxed font-normal"
            style={{ color: "#4d5d53" }}
          >
            Eliminate server bottlenecks and paper menus. Provide instant digital table ordering, dynamic contactless UPI/card checkout, and coordinated kitchen throughput — all from one unified owner portal.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div
              className="rounded-2xl p-4 text-left shadow-xs transition"
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e0d8cc",
              }}
            >
              <div className="font-black text-2xl" style={{ color: "#0f2419" }}>
                0%
              </div>
              <div className="text-xs font-medium mt-1" style={{ color: "#6c7d73" }}>
                Hardware required
              </div>
            </div>
            <div
              className="rounded-2xl p-4 text-left shadow-xs transition"
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e0d8cc",
              }}
            >
              <div className="font-black text-2xl" style={{ color: "#0f2419" }}>
                &lt; 3 mins
              </div>
              <div className="text-xs font-medium mt-1" style={{ color: "#6c7d73" }}>
                Menu & QR setup
              </div>
            </div>
            <div
              className="rounded-2xl p-4 text-left shadow-xs transition col-span-2 sm:col-span-1"
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e0d8cc",
              }}
            >
              <div className="font-black text-2xl" style={{ color: "#0f2419" }}>
                100%
              </div>
              <div className="text-xs font-medium mt-1" style={{ color: "#6c7d73" }}>
                Direct merchant payout
              </div>
            </div>
          </div>

          {/* Secure Private System Guarantee */}
          <div
            className="flex items-center justify-center lg:justify-start gap-2.5 text-xs font-medium pt-2"
            style={{ color: "#5c6b62" }}
          >
            <ShieldCheck className="h-4 w-4 text-[#2d6a4f] shrink-0" />
            <span>Authenticated owner portal. Operational controls are strictly private.</span>
          </div>
        </div>

        {/* Right Column: Dedicated Business Portal Card */}
        <div className="w-full max-w-md lg:max-w-lg">
          <div
            className="rounded-3xl p-7 sm:p-9 shadow-xl relative"
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #dfd7cb",
            }}
          >
            {isLoggedIn ? (
              /* Already Logged In Card */
              <div className="text-center py-4 space-y-6">
                <div className="py-2 flex justify-center">
                  <OrderlyLogo size="lg" theme="light" showTagline={true} taglineText="Restaurant OS" />
                </div>
                <div>
                  <div
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: "#2d6a4f" }}
                  >
                    Active Session Detected
                  </div>
                  <h3 className="text-2xl font-black mt-1" style={{ color: "#0f2419" }}>
                    {activeBizName || "Your Business"}
                  </h3>
                  <p className="text-xs mt-1" style={{ color: "#6c7d73" }}>
                    You are currently authenticated as the business owner.
                  </p>
                </div>
                <div className="space-y-3 pt-2">
                  <Link
                    href="/dashboard"
                    className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-sm text-sm font-bold text-white transition hover:opacity-95"
                    style={{ backgroundColor: "#0f2419" }}
                  >
                    Open Owner Dashboard
                    <ArrowRight className="ml-2 h-4 w-4 text-[#52b788]" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      document.cookie = "orderly_demo_session=; path=/; max-age=0";
                      setIsLoggedIn(false);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition cursor-pointer hover:bg-[#f5f0e8]"
                    style={{
                      border: "1px solid #d8d1c5",
                      color: "#5c6b62",
                    }}
                  >
                    Switch Business / Log Out
                  </button>
                </div>
              </div>
            ) : (
              /* Dual Portal: Log In / Register */
              <div>
                {/* Tab Switcher */}
                <div
                  className="grid grid-cols-2 p-1 rounded-2xl mb-6"
                  style={{
                    backgroundColor: "#f2ece0",
                    border: "1px solid #e0d8cc",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab("login")}
                    className={`py-2.5 text-xs sm:text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                      activeTab === "login"
                        ? "text-white shadow-xs"
                        : "text-[#5c6b62] hover:text-[#1a2e1f]"
                    }`}
                    style={{
                      backgroundColor: activeTab === "login" ? "#0f2419" : "transparent",
                    }}
                  >
                    <LogIn className="h-4 w-4" />
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("register")}
                    className={`py-2.5 text-xs sm:text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                      activeTab === "register"
                        ? "text-white shadow-xs"
                        : "text-[#5c6b62] hover:text-[#1a2e1f]"
                    }`}
                    style={{
                      backgroundColor: activeTab === "register" ? "#0f2419" : "transparent",
                    }}
                  >
                    <UserPlus className="h-4 w-4" />
                    Register
                  </button>
                </div>

                {/* Tab 1: Log In */}
                {activeTab === "login" && (
                  <div>
                    <div className="mb-5 text-left">
                      <h3 className="text-xl font-black" style={{ color: "#0f2419" }}>
                        Welcome Back
                      </h3>
                      <p className="text-xs mt-1" style={{ color: "#6c7d73" }}>
                        Sign in to access your menu, tables, and live kitchen orders.
                      </p>
                    </div>

                    {loginError && (
                      <div
                        className="mb-4 text-xs rounded-xl p-3 flex items-start gap-2.5"
                        style={{
                          backgroundColor: "#fdf2f2",
                          border: "1px solid #fecaca",
                          color: "#991b1b",
                        }}
                      >
                        <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                        <div>{loginError}</div>
                      </div>
                    )}

                    <form className="space-y-4" onSubmit={handleLogin}>
                      <div>
                        <label
                          className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                          style={{ color: "#2d6a4f" }}
                        >
                          Business Email or Account ID
                        </label>
                        <input
                          type="text"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
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
                            className="block text-xs font-bold uppercase tracking-wider"
                            style={{ color: "#2d6a4f" }}
                          >
                            Password
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setShowLoginPassword(!showLoginPassword)}
                              className="text-xs text-[#6c7d73] hover:text-[#0f2419] flex items-center gap-1 cursor-pointer"
                            >
                              {showLoginPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              {showLoginPassword ? "Hide" : "Show"}
                            </button>
                            <span className="text-[#d8d1c5]">•</span>
                            <button
                              type="button"
                              onClick={() => setForgotOpen(true)}
                              className="text-xs font-semibold text-[#2d6a4f] hover:underline cursor-pointer"
                            >
                              Forgot?
                            </button>
                          </div>
                        </div>
                        <input
                          type={showLoginPassword ? "text" : "password"}
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
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
                        disabled={loginLoading}
                        className="w-full mt-2 flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60 cursor-pointer"
                        style={{ backgroundColor: "#0f2419" }}
                      >
                        {loginLoading ? "Authenticating..." : "Sign In to Business"}
                        <ArrowRight className="ml-2 h-4 w-4 text-[#52b788]" />
                      </button>
                    </form>

                    <div
                      className="mt-5 pt-4"
                      style={{ borderTop: "1px solid #eae4d8" }}
                    >
                      <button
                        type="button"
                        onClick={handleDemoAccess}
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

                    <div className="mt-5 text-center text-xs" style={{ color: "#6c7d73" }}>
                      New to Orderly?{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("register")}
                        className="font-bold hover:underline underline-offset-4 cursor-pointer"
                        style={{ color: "#0f2419" }}
                      >
                        Register your business &rarr;
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab 2: Register New Business */}
                {activeTab === "register" && (
                  <div>
                    <div className="mb-4 text-left">
                      <h3 className="text-xl font-black" style={{ color: "#0f2419" }}>
                        Register Your Business
                      </h3>
                      <p className="text-xs mt-1" style={{ color: "#6c7d73" }}>
                        Launch your digital menu & QR table codes in under 3 minutes.
                      </p>
                    </div>

                    {regError && (
                      <div
                        className="mb-4 text-xs rounded-xl p-3 flex items-start gap-2.5"
                        style={{
                          backgroundColor: "#fdf2f2",
                          border: "1px solid #fecaca",
                          color: "#991b1b",
                        }}
                      >
                        <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                        <div>{regError}</div>
                      </div>
                    )}

                    <form className="space-y-3" onSubmit={handleRegister}>
                      <div>
                        <label
                          className="block text-xs font-bold uppercase tracking-wider mb-1"
                          style={{ color: "#2d6a4f" }}
                        >
                          Business Type *
                        </label>
                        <select
                          value={regType}
                          onChange={(e) => setRegType(e.target.value as BusinessType)}
                          className="block w-full rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none"
                          style={{
                            backgroundColor: "#faf8f4",
                            border: "1px solid #d8d1c5",
                            color: "#0f2419",
                          }}
                        >
                          {BUSINESS_TYPES.map((b) => (
                            <option key={b.value} value={b.value}>
                              {b.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          className="block text-xs font-bold uppercase tracking-wider mb-1"
                          style={{ color: "#2d6a4f" }}
                        >
                          Brand / Outlet Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="e.g. Copper Chimney or Creamy Scoops"
                          className="block w-full rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none"
                          style={{
                            backgroundColor: "#faf8f4",
                            border: "1px solid #d8d1c5",
                            color: "#0f2419",
                          }}
                        />
                      </div>

                      <div>
                        <label
                          className="block text-xs font-bold uppercase tracking-wider mb-1"
                          style={{ color: "#2d6a4f" }}
                        >
                          Owner / Manager Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={regOwner}
                          onChange={(e) => setRegOwner(e.target.value)}
                          placeholder="e.g. Rajesh Kumar"
                          className="block w-full rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none"
                          style={{
                            backgroundColor: "#faf8f4",
                            border: "1px solid #d8d1c5",
                            color: "#0f2419",
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label
                            className="block text-xs font-bold uppercase tracking-wider mb-1"
                            style={{ color: "#2d6a4f" }}
                          >
                            Email *
                          </label>
                          <input
                            type="email"
                            required
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="owner@food.com"
                            className="block w-full rounded-xl px-3 py-2 text-xs focus:outline-none"
                            style={{
                              backgroundColor: "#faf8f4",
                              border: "1px solid #d8d1c5",
                              color: "#0f2419",
                            }}
                          />
                        </div>
                        <div>
                          <label
                            className="block text-xs font-bold uppercase tracking-wider mb-1"
                            style={{ color: "#2d6a4f" }}
                          >
                            Password *
                          </label>
                          <input
                            type="password"
                            required
                            minLength={6}
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Min 6 chars"
                            className="block w-full rounded-xl px-3 py-2 text-xs focus:outline-none"
                            style={{
                              backgroundColor: "#faf8f4",
                              border: "1px solid #d8d1c5",
                              color: "#0f2419",
                            }}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={regLoading}
                        className="w-full mt-2 flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60 cursor-pointer"
                        style={{ backgroundColor: "#0f2419" }}
                      >
                        {regLoading ? "Registering..." : "Create & Launch Business"}
                        <ArrowRight className="ml-2 h-4 w-4 text-[#52b788]" />
                      </button>
                    </form>

                    <div className="mt-4 text-center text-xs" style={{ color: "#6c7d73" }}>
                      Already registered?{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("login")}
                        className="font-bold hover:underline underline-offset-4 cursor-pointer"
                        style={{ color: "#0f2419" }}
                      >
                        Sign in to your business &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="py-6 text-center text-xs relative z-10"
        style={{
          borderTop: "1px solid #e0d8cc",
          backgroundColor: "#ebe4d8",
          color: "#6c7d73",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <OrderlyLogo size="sm" theme="light" />
            <span style={{ color: "#6c7d73" }}>— Enterprise Dining & Payment Platform</span>
          </div>
          <div className="text-[11px]" style={{ color: "#6c7d73" }}>
            &copy; {new Date().getFullYear()} Orderly Technologies. Protected Business Portal.
          </div>
        </div>
      </footer>
      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialIdentifier={loginEmail}
        onSuccessReset={(email) => {
          setLoginEmail(email);
          setLoginPassword("");
        }}
      />
    </div>
  );
}
