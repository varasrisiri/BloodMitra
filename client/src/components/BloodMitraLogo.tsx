import React from "react";

interface BloodMitraLogoProps {
  className?: string;
  size?: number;
}

/**
 * BloodMitra logo – uses the official uploaded brand mark.
 */
export function BloodMitraLogo({ className = "", size = 32 }: BloodMitraLogoProps) {
  return (
    <img
      src="/bloodmitra-logo.png"
      alt="BloodMitra logo"
      width={size}
      height={size}
      className={`inline-block object-contain flex-shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      loading="eager"
    />
  );
}
