import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kitchen Display System (KDS)",
  description: "Live interactive kitchen order queue and ticket management for culinary staff.",
};

export default function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="dark bg-slate-950 min-h-screen">{children}</div>;
}
