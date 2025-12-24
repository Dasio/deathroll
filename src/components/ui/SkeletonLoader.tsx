interface SkeletonLoaderProps {
  className?: string;
  variant?: "text" | "rect" | "circle";
}

export function SkeletonLoader({ className = "", variant = "rect" }: SkeletonLoaderProps) {
  const baseStyles = "bg-[var(--card-border)] animate-pulse";

  const variants = {
    text: "h-4 rounded",
    rect: "h-20 rounded-lg",
    circle: "rounded-full",
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`} />
  );
}

export function PlayerListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonLoader variant="circle" className="w-10 h-10" />
          <div className="flex-1">
            <SkeletonLoader variant="text" className="w-32 mb-2" />
            <SkeletonLoader variant="text" className="w-20 h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}
