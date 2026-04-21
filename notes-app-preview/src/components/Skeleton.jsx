/** Skeleton loading card — shown while notes/subjects are being fetched. */
export default function Skeleton({ height = 200, borderRadius = 20 }) {
  return (
    <div style={{
      height, borderRadius,
      background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.6s infinite",
    }} />
  );
}

/** Grid of skeleton cards to fill a loading notes/subjects grid. */
export function SkeletonGrid({ count = 6, height = 220 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
      {Array.from({ length: count }).map((_, i) => <Skeleton key={i} height={height} />)}
    </div>
  );
}
