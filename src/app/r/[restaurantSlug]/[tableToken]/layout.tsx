import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Table Menu & Contactless Ordering",
  description: "Browse dishes, customize items, and pay securely directly from your dining table.",
};

export default function CustomerOrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-slate-50">{children}</div>;
}
