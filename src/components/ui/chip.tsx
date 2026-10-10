import { focusRing } from "./focus";

type ChipProps = {
  label: string;
  selected: boolean;
  onSelect: () => void;
};

export function Chip({ label, selected, onSelect }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`rounded-control inline-flex min-h-11 items-center border px-3 text-base ${
        selected
          ? "border-ink bg-ink text-background"
          : "border-line bg-surface text-ink hover:bg-track"
      } ${focusRing}`}
    >
      {label}
    </button>
  );
}
