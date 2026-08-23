export const LoaderOne = () => (
  <div className="flex items-center gap-1.5" aria-hidden="true">
    {[0, 1, 2].map((item) => (
      <span
        key={item}
        className="size-2.5 animate-bounce rounded-full bg-site-green motion-reduce:animate-none"
        style={{ animationDelay: `${item * 150}ms` }}
      />
    ))}
  </div>
);
