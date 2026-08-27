interface SkeletonProps {
  className?: string;
}

const Skeleton = ({ className = "" }: SkeletonProps) => (
  <div
    aria-hidden="true"
    className={`shimmer rounded-md bg-gray-200 ${className}`}
  />
);

export default Skeleton;
