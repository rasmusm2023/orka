type ProgressRingProps = {
  ratio: number;
  value: string;
  unit: string;
  label: string;
};

export function ProgressRing({ ratio, value, unit, label }: ProgressRingProps) {
  const size = 168;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, ratio));
  const offset = circumference * (1 - clamped);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative size-40">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="size-full -rotate-90"
          role="img"
          aria-label={`${label} ${value} ${unit}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-track"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="progress-ring__value stroke-food"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-5xl leading-none font-semibold tabular-nums">
            {value}
          </span>
          <span className="text-muted mt-1 text-sm">{unit}</span>
        </div>
      </div>
      <p className="text-muted text-sm font-medium">{label}</p>
    </div>
  );
}
