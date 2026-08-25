import { useMemo, useState } from "react";
import { FaClock, FaInfoCircle } from "react-icons/fa";

interface TimeEstimateFieldProps {
  value: string;
  onChange: (value: string) => void;
}

const parseTimeEstimate = (
  value: string,
): { days: number; hours: number; totalHours: number } | null => {
  const match = value
    .trim()
    .toLowerCase()
    .match(/^(?:(\d+)\s*d)?\s*(?:(\d+)\s*h)?$/);
  if (!match || (!match[1] && !match[2])) return null;
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  return {
    days: days + Math.floor(hours / 8),
    hours: hours % 8,
    totalHours: days * 8 + hours,
  };
};

const formatEstimate = ({
  days,
  hours,
}: NonNullable<ReturnType<typeof parseTimeEstimate>>): string =>
  [
    days > 0 ? `${days} ${days === 1 ? "day" : "days"}` : "",
    hours > 0 ? `${hours} ${hours === 1 ? "hour" : "hours"}` : "",
  ]
    .filter(Boolean)
    .join(" ");

const TimeEstimateField = ({ value, onChange }: TimeEstimateFieldProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const parsedEstimate = useMemo(() => parseTimeEstimate(value), [value]);
  const showFeedback = isFocused && value.trim().length > 0;
  return (
    <div>
      <label
        htmlFor="task-time-estimate"
        className="flex items-center gap-1 text-xs font-semibold text-gray-700"
      >
        Time estimate{" "}
        <FaInfoCircle
          className="text-gray-400"
          aria-label="One day equals eight hours"
        />
      </label>
      <div className="relative mt-1.5">
        <FaClock
          className="pointer-events-none absolute left-3 top-3 text-gray-400"
          aria-hidden="true"
        />
        <input
          id="task-time-estimate"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="e.g. 1d 4h"
          className="h-10 w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-site-green focus:outline-none focus:ring-1 focus:ring-site-green"
        />
      </div>
      {showFeedback ? (
        <div className="mt-2 rounded-lg border border-gray-200 bg-slate-50 px-3 py-2.5 text-xs">
          <p className="text-gray-500">1 day equals 8 hours.</p>
          {parsedEstimate ? (
            <p className="mt-1 font-semibold text-gray-800">
              {formatEstimate(parsedEstimate)}{" "}
              <span className="font-normal text-gray-500">
                ({parsedEstimate.totalHours} hours total)
              </span>
            </p>
          ) : (
            <p className="mt-1 font-medium text-red-600">
              Use days and hours, for example: 1d 4h.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default TimeEstimateField;
