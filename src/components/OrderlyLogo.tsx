"use client";

import React from "react";

interface OrderlyLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  theme?: "dark" | "light" | "auto";
  showTagline?: boolean;
  taglineText?: string;
  className?: string;
}

export default function OrderlyLogo({
  size = "md",
  theme = "dark",
  showTagline = false,
  taglineText = "Restaurant OS",
  className = "",
}: OrderlyLogoProps) {
  const fontSizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl",
  }[size];

  const tagSizes = {
    sm: "text-[10px] tracking-[0.2em]",
    md: "text-[11px] tracking-[0.22em]",
    lg: "text-xs tracking-[0.25em]",
    xl: "text-sm tracking-[0.25em]",
  }[size];

  const dotSizes = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
    xl: "h-3.5 w-3.5",
  }[size];

  const isLight = theme === "light";

  return (
    <div className={`inline-flex flex-col select-none leading-none ${className}`}>
      <div className="flex items-baseline gap-1">
        <span
          className={`font-black tracking-tighter ${fontSizes}`}
          style={{
            fontFamily: "var(--font-geist-sans), 'Inter', system-ui, sans-serif",
            letterSpacing: "-0.04em",
            color: isLight ? "#0f2419" : "#ffffff",
          }}
        >
          orderly
        </span>
        <span
          className={`rounded-full shrink-0 ${dotSizes}`}
          style={{
            background: isLight ? "#2d6a4f" : "#52b788",
          }}
        />
      </div>
      {showTagline && (
        <span
          className={`font-bold uppercase ${tagSizes} mt-1`}
          style={{
            color: isLight ? "#5c6b62" : "#83a593",
          }}
        >
          {taglineText}
        </span>
      )}
    </div>
  );
}
