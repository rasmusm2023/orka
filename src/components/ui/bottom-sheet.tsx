import type { ReactNode, Ref } from "react";
import { focusRing } from "./focus";

type BottomSheetProps = {
  title: string;
  closeLabel: string;
  onClose: () => void;
  closeRef?: Ref<HTMLButtonElement>;
  children: ReactNode;
};

export function BottomSheet({
  title,
  closeLabel,
  onClose,
  closeRef,
  children,
}: BottomSheetProps) {
  return (
    <div className="bg-ink/40 absolute inset-0 flex items-end">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="rounded-t-card border-line bg-surface shadow-card w-full border-t px-4 pt-3 pb-5"
      >
        <div className="bg-line mx-auto mb-3 h-1 w-10 rounded-full" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-2xl leading-none font-semibold">
            {title}
          </h3>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={`text-muted min-h-11 px-2 text-sm font-medium ${focusRing}`}
          >
            {closeLabel}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
