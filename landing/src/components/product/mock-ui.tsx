import type { ReactNode } from "react";

export type MockOption = { value: string; label: string };

function CaretIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m3 4.75 3 3 3-3" />
    </svg>
  );
}

/**
 * Styled native select. Native popups are used on purpose: they escape the
 * window's `overflow: hidden` and stay keyboard/screen-reader correct.
 */
export function MockSelect({
  value,
  options,
  onChange,
  label,
  disabled,
  className,
}: {
  value: string;
  options: readonly MockOption[];
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <span className={className ? `mock-select-wrap ${className}` : "mock-select-wrap"}>
      <select
        className="mock-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="mock-select-caret" aria-hidden>
        <CaretIcon />
      </span>
    </span>
  );
}

export function MockSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={checked ? "mock-toggle" : "mock-toggle off"}
      onClick={() => onChange(!checked)}
    />
  );
}

export function MockField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="mock-field">
      <span className="mock-field-label">{label}</span>
      {children}
      {hint ? <span className="mock-field-hint">{hint}</span> : null}
    </label>
  );
}

export function MockInput({
  value,
  onChange,
  type = "text",
  ariaLabel,
  placeholder,
  min,
  max,
}: {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "password";
  ariaLabel: string;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <input
      className="mock-input"
      type={type}
      value={value}
      aria-label={ariaLabel}
      placeholder={placeholder}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
