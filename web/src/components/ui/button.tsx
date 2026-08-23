"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "icon";

const VARIANTS: Record<Variant, string> = {
  // Primary actions use neutral ink, not colour. Colour is reserved for
  // meaning (focus, citations), not for emphasis.
  primary:
    "bg-n-12 text-n-0 hover:bg-n-11 disabled:bg-n-5 disabled:text-n-0",
  secondary:
    "bg-n-0 text-n-11 border border-n-3 hover:bg-n-1 hover:border-n-4 disabled:text-n-6",
  ghost: "text-n-9 hover:bg-n-2 hover:text-n-11 disabled:text-n-6",
  danger:
    "bg-n-0 text-danger border border-n-3 hover:bg-danger-soft hover:border-danger/40",
};

const SIZES: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5",
  md: "h-8 px-3 text-sm gap-2",
  icon: "h-8 w-8 justify-center",
};

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
  }
>(function Button(
  { className, variant = "secondary", size = "md", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex shrink-0 items-center rounded font-medium",
        "transition-colors duration-150 ease-out",
        "disabled:pointer-events-none disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});
