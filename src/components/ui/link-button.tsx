import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { buttonClass, buttonVariants } from "./button";

type LinkButtonProps = {
  href: string;
  children: ReactNode;
  variant?: keyof typeof buttonVariants;
  className?: string;
};

export function LinkButton({
  href,
  children,
  variant = "primary",
  className = "",
}: LinkButtonProps) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}
