import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  body: string;
  action?: ReactNode;
};

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="rounded-card border-line border border-dashed px-4 py-8 text-center">
      <h3 className="font-display text-2xl leading-none font-semibold">
        {title}
      </h3>
      <p className="text-muted mx-auto mt-2 max-w-xs text-base">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
