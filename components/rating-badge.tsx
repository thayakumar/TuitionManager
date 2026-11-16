export function RatingBadge({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="rating-pill" aria-label={`Rating: ${rating} out of 5`}>
      {rating}/5
    </span>
  );
}
