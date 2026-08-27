import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "text";
export type ButtonSize = "md" | "lg";

/**
 * Design system 07 — height 44px, radius 12px, Inter Medium.
 * `forceHover` renders the hover treatment statically so the design system page
 * can show the hover row without duplicating the styles.
 */
const base =
  "inline-flex h-11 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed";

const sizes: Record<ButtonSize, string> = {
  md: "px-3 text-body",
  lg: "px-4 text-body-lg",
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-500 text-white shadow-sm hover:bg-primary-600 disabled:bg-primary-100 disabled:text-primary-300 disabled:shadow-none",
  secondary:
    "border border-primary-500 bg-surface text-primary-500 hover:bg-primary-100 disabled:border-primary-200 disabled:bg-surface disabled:text-primary-300",
  tertiary:
    "border border-neutral-200 bg-surface text-neutral-900 hover:shadow-md disabled:text-neutral-300 disabled:shadow-none",
  text: "px-0 text-primary-500 hover:text-primary-600 disabled:text-primary-300",
};

const forcedHover: Record<ButtonVariant, string> = {
  primary: "bg-primary-600",
  secondary: "bg-primary-100",
  tertiary: "shadow-md",
  text: "text-primary-600",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  forceHover?: boolean;
}

export function Button({
  variant = "primary",
  size = "lg",
  forceHover = false,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        base,
        sizes[size],
        variants[variant],
        forceHover && !props.disabled && forcedHover[variant],
        className,
      )}
      {...props}
    />
  );
}
