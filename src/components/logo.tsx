/** Farmasi wordmark used consistently across the demo. */
export function Logo({ className }: { className?: string }) {
  return (
    <span aria-label="Farmasi" className={`farmasi-logo ${className ?? ""}`}>FARMASI</span>
  );
}
