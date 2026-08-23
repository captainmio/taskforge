interface ProgressBarProps {
  value: number;
  label?: string;
  showValue?: boolean;
  className?: string;
}

const ProgressBar = ({
  value,
  label = "Progress",
  showValue = true,
  className = "",
}: ProgressBarProps) => {
  const percentage = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div className={`flex min-w-24 items-center gap-2 ${className}`}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-gray-100"
      >
        <span
          className="block h-full rounded-full bg-site-green transition-[width]"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showValue ? (
        <span className="text-xs font-medium text-gray-500">{percentage}%</span>
      ) : null}
    </div>
  );
};

export default ProgressBar;
