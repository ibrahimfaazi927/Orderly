"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerBusiness } from "@/lib/auth-service";
import {
  UtensilsCrossed,
  ArrowRight,
  AlertCircle,
  Building2,
  Coffee,
  IceCream,
  Croissant,
  Truck,
  Beer,
  Pizza,
  Store,
} from "lucide-react";
import { BusinessType } from "@/types/database";
import OrderlyLogo from "@/components/OrderlyLogo";

const BUSINESS_TYPES = [
  { value: "RESTAURANT", label: "Restaurant / Fine Dining", icon: UtensilsCrossed, desc: "Full service dining, multi-course menus" },
  { value: "CAFE", label: "Cafe & Coffee Roastery", icon: Coffee, desc: "Espresso, beverages, light bites" },
  { value: "ICE_CREAM", label: "Ice Cream Parlour & Desserts", icon: IceCream, desc: "Scoops, sundaes, gelatos, waffles" },
  { value: "BAKERY", label: "Bakery & Patisserie", icon: Croissant, desc: "Breads, pastries, artisan cakes" },
  { value: "FOOD_TRUCK", label: "Food Truck & Pop-up", icon: Truck, desc: "Mobile dining, quick counter pick-up" },
  { value: "BAR_PUB", label: "Bar, Pub & Brewery", icon: Beer, desc: "Craft beers, cocktails, finger foods" },
  { value: "FAST_FOOD", label: "Fast Food & Quick Service (QSR)", icon: Pizza, desc: "Fast takeout, burgers, wraps" },
  { value: "OTHER", label: "Other Food & Dining Business", icon: Store, desc: "Kiosks, cafeterias, clubs" },
];

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("RESTAURANT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await registerBusiness({
        businessName: restaurantName,
        businessType,
        fullName,
        email,
        password,
      });

      if (!res.success) {
        setError(res.error || "Failed to create business account");
        setLoading(false);
        return;
      }

      router.push(`/dashboard/onboarding?name=${encodeURIComponent(restaurantName)}&type=${encodeURIComponent(businessType)}`);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during registration");
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
          Register Your Business
        </h2>
        <p className="mt-2 text-sm" style={{ color: "#6c7d73" }}>
          Instant QR table ordering, contactless billing, and real-time kitchen tracking.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
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

          <form className="space-y-4" onSubmit={handleSignup}>
            {/* Business Type Selector */}
            <div>
              <label
                className="block text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: "#2d6a4f" }}
              >
                Select Your Business Type *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {BUSINESS_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = businessType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setBusinessType(type.value as BusinessType)}
                      className="text-left p-3 rounded-2xl border transition flex items-start gap-2.5 cursor-pointer"
                      style={{
                        backgroundColor: isSelected ? "#eef6f0" : "#faf8f4",
                        borderColor: isSelected ? "#2d6a4f" : "#e0d8cc",
                      }}
                    >
                      <div
                        className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          backgroundColor: isSelected ? "#0f2419" : "#eae4d8",
                          color: isSelected ? "#52b788" : "#5c6b62",
                        }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div
                          className="text-xs font-bold truncate leading-snug"
                          style={{ color: isSelected ? "#0f2419" : "#1a2e1f" }}
                        >
                          {type.label}
                        </div>
                        <div className="text-[10px] truncate mt-0.5" style={{ color: "#6c7d73" }}>
                          {type.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Business Name */}
            <div>
              <label
                htmlFor="restaurantName"
                className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                style={{ color: "#2d6a4f" }}
              >
                Business / Brand Name *
              </label>
              <div className="relative">
                <input
                  id="restaurantName"
                  name="restaurantName"
                  type="text"
                  required
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="e.g. Copper Chimney, Creamy Scoops, or Blue Tokai"
                  className="block w-full rounded-xl pl-3.5 pr-10 py-2.5 text-sm transition focus:outline-none"
                  style={{
                    backgroundColor: "#faf8f4",
                    border: "1px solid #d8d1c5",
                    color: "#0f2419",
                  }}
                />
                <Building2 className="absolute right-3.5 top-3 h-4 w-4 text-[#8a9690]" />
              </div>
            </div>

            {/* Owner Full Name */}
            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                style={{ color: "#2d6a4f" }}
              >
                Owner / General Manager Name *
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ibrahim Faazi"
                className="block w-full rounded-xl px-3.5 py-2.5 text-sm transition focus:outline-none"
                style={{
                  backgroundColor: "#faf8f4",
                  border: "1px solid #d8d1c5",
                  color: "#0f2419",
                }}
              />
            </div>

            {/* Email & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: "#2d6a4f" }}
                >
                  Work Email *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@business.com"
                  className="block w-full rounded-xl px-3.5 py-2.5 text-sm transition focus:outline-none"
                  style={{
                    backgroundColor: "#faf8f4",
                    border: "1px solid #d8d1c5",
                    color: "#0f2419",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: "#2d6a4f" }}
                >
                  Password *
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  minLength={6}
                  className="block w-full rounded-xl px-3.5 py-2.5 text-sm transition focus:outline-none"
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
              disabled={loading}
              className="w-full mt-3 flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60 cursor-pointer"
              style={{ backgroundColor: "#0f2419" }}
            >
              {loading ? "Creating Your Business..." : "Register & Launch Business"}
              <ArrowRight className="ml-2 h-4 w-4 text-[#52b788]" />
            </button>
          </form>

          <div className="mt-6 pt-5 text-center text-sm" style={{ borderTop: "1px solid #eae4d8", color: "#6c7d73" }}>
            Already registered your business?{" "}
            <Link
              href="/login"
              className="font-bold hover:underline transition underline-offset-4"
              style={{ color: "#0f2419" }}
            >
              Log in to your business &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
