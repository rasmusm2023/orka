import type { ReactNode } from "react";

type IconProps = { className?: string };

function Icon({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className ?? "size-6"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function TodayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8.5v4.2l2.4 1.6" />
    </Icon>
  );
}

export function FoodIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 10.5h14v1.2a7 7 0 0 1-14 0z" />
      <path d="M8 10.5V7.2M12 10.5V6M16 10.5V7.2" />
    </Icon>
  );
}

export function TrainingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 9v6M18 9v6M3.5 10.5v3M20.5 10.5v3M6 12h12" />
    </Icon>
  );
}

export function ProgressIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 16.5l5-5 3 3 7-7" />
      <path d="M14 7.5h5v5" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M4.8 6.2l1.6 1.6M17.6 16.2l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.8 17.8l1.6-1.6M17.6 7.8l1.6-1.6" />
    </Icon>
  );
}
