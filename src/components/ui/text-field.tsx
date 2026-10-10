import { useId, type InputHTMLAttributes } from "react";
import { focusRing } from "./focus";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function TextField({ label, hint, id, ...props }: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <label htmlFor={fieldId} className="block">
      <span className="text-ink text-sm font-medium">{label}</span>
      <input
        id={fieldId}
        className={`rounded-control border-line bg-surface text-ink mt-1.5 h-11 w-full border px-3 text-base tabular-nums ${focusRing}`}
        {...props}
      />
      {hint ? (
        <span className="text-muted mt-1.5 block text-sm">{hint}</span>
      ) : null}
    </label>
  );
}
