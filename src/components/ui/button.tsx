import type { ButtonHTMLAttributes } from "react";
import { focusRing } from "./focus";

export const buttonVariants = {
  primary: "bg-ink text-background hover:bg-ink-hover",
  secondary: "border border-line bg-surface text-ink hover:bg-track",
  ghost: "bg-transparent text-ink hover:bg-track",
} as const;

export function buttonClass(
  variant: keyof typeof buttonVariants,
  className = "",
) {
  return `rounded-control inline-flex min-h-11 items-center justify-center px-4 text-base font-medium disabled:opacity-40 ${buttonVariants[variant]} ${focusRing} ${className}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, className)}
      {...props}
    />
  );
}
