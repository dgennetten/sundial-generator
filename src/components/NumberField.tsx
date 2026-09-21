import React, { useEffect, useRef, useState } from 'react';

type NumberFieldProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> & {
  value: number;
  /** Called on each edit that parses to a finite number. */
  onValueChange: (n: number) => void;
  /** Display formatting when the field is not focused. Default: String(value). */
  format?: (n: number) => string;
};

/**
 * Controlled numeric input that you can actually erase and retype.
 *
 * A raw `<input type="number" value={someNumber}>` whose onChange coerces the
 * text straight back to a number (`parseInt(...) || default`, `Number()`,
 * `toFixed()`, …) fights the user mid-edit: clearing the field yields an empty
 * string that snaps back to a default, so you can't delete the old value to type
 * a new one. This keeps a local text buffer while the field is focused — every
 * keystroke is honored, including empty / "-" / "." intermediate states — and
 * only pushes a finite parsed number up via onValueChange. On blur it re-syncs
 * the display to the canonical numeric value. Mirrors the latitude/longitude
 * fields in LocationInputs.
 */
const NumberField: React.FC<NumberFieldProps> = ({
  value,
  onValueChange,
  format,
  onFocus,
  onBlur,
  ...rest
}) => {
  const toDisplay = (n: number) => (format ? format(n) : String(n));
  const [buffer, setBuffer] = useState<string>(() => toDisplay(value));
  const focused = useRef(false);

  // Keep the buffer synced with external/programmatic value changes (presets,
  // reset, World Tour, unit switches), but never while the user is typing —
  // that would clobber the in-progress edit.
  useEffect(() => {
    if (!focused.current) setBuffer(toDisplay(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, format]);

  return (
    <input
      {...rest}
      type="number"
      value={buffer}
      onFocus={(e) => {
        focused.current = true;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.current = false;
        setBuffer(toDisplay(value));
        onBlur?.(e);
      }}
      onChange={(e) => {
        setBuffer(e.target.value);
        const n = parseFloat(e.target.value);
        if (Number.isFinite(n)) onValueChange(n);
      }}
    />
  );
};

export default NumberField;
