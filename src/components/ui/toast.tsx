import { focusRing } from "./focus";

type ToastProps = {
  message: string;
  actionLabel: string;
  onAction: () => void;
};

export function Toast({ message, actionLabel, onAction }: ToastProps) {
  return (
    <div
      role="status"
      className="rounded-control bg-ink text-background shadow-card flex min-h-11 items-center justify-between gap-3 px-3 py-2"
    >
      <p className="text-sm">{message}</p>
      <button
        type="button"
        onClick={onAction}
        className={`min-h-11 px-2 text-sm font-medium underline-offset-4 hover:underline ${focusRing}`}
      >
        {actionLabel}
      </button>
    </div>
  );
}
