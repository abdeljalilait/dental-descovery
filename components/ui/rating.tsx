import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function RatingStars({
  rating,
  size = 16,
  className,
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={i < Math.round(rating) ? "fill-warning text-warning" : "fill-border text-border"}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

export function RatingValue({
  rating,
  reviewCount,
  source,
  size = 16,
  className,
}: {
  rating: number;
  reviewCount: number;
  source?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm", className)}>
      <RatingStars rating={rating} size={size} />
      <span className="font-bold tabular-nums">{rating.toFixed(1).replace(".", ",")}</span>
      {reviewCount > 0 ? <span className="text-muted">({reviewCount})</span> : null}
      {source ? <span className="sr-only">{source}</span> : null}
    </span>
  );
}
