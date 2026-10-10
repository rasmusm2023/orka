import { Button } from "./button";

type StepperProps = {
  label: string;
  value: string;
  unit: string;
  decrementLabel: string;
  incrementLabel: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled?: boolean;
};

export function Stepper({
  label,
  value,
  unit,
  decrementLabel,
  incrementLabel,
  onDecrement,
  onIncrement,
  decrementDisabled = false,
}: StepperProps) {
  return (
    <div>
      <p className="text-ink text-sm font-medium">{label}</p>
      <div className="mt-1.5 flex items-center gap-3">
        <Button
          variant="secondary"
          className="size-11 px-0 text-xl"
          aria-label={decrementLabel}
          disabled={decrementDisabled}
          onClick={onDecrement}
        >
          −
        </Button>
        <p className="font-display text-ink min-w-24 text-center text-4xl leading-none font-semibold tabular-nums">
          {value}
          <span className="text-muted ml-1 font-sans text-base font-medium">
            {unit}
          </span>
        </p>
        <Button
          variant="secondary"
          className="size-11 px-0 text-xl"
          aria-label={incrementLabel}
          onClick={onIncrement}
        >
          +
        </Button>
      </div>
    </div>
  );
}
