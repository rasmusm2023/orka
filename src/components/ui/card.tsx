import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function Card({ title, action, children }: CardProps) {
  return (
    <section className="rounded-card border-line bg-surface shadow-card border p-4">
      {title || action ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title ? (
            <h3 className="font-display text-2xl leading-none font-semibold tracking-tight">
              {title}
            </h3>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
